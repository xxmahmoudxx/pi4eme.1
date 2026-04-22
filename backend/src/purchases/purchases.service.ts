import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { EtlService, ColumnMapping } from '../etl/etl.service';
import { OcrService } from '../ocr/ocr.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectModel(Purchase.name)
        private readonly purchaseModel: Model<PurchaseDocument>,
        private readonly etl: EtlService,
        private readonly ocr: OcrService,
        private readonly suppliersService: SuppliersService,
        private readonly analyticsService: AnalyticsService,
    ) { }

    // ── Create single purchase (manual entry) ────────────────────
    async create(companyId: string, data: any): Promise<Purchase> {
        // Smart: compute whichever is missing
        let unitCost = data.unitCost ?? 0;
        let totalCost = data.totalCost ?? 0;
        const quantity = data.quantity || 0;

        if (totalCost && !unitCost && quantity > 0) {
            unitCost = totalCost / quantity;
        } else if (unitCost && !totalCost) {
            totalCost = quantity * unitCost;
        } else if (!totalCost) {
            totalCost = quantity * unitCost;
        }

        // Auto-create supplier if new
        const supplierName = data.supplier || 'Unknown';
        try {
            await this.suppliersService.findOrCreate(companyId, supplierName);
        } catch (e: any) {
            console.warn('Supplier auto-create failed:', e?.message || e);
        }

        const purchaseData: any = {
            companyId: Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId,
            date: data.date ? new Date(data.date) : new Date(),
            supplier: supplierName,
            category: data.category || '',
            item: data.item,
            quantity,
            unitCost,
            totalCost,
            status: data.isRequest ? 'pending_review' : (data.status || 'received'),
            notes: data.notes || '',
            submittedBy: data.submittedBy || 'Owner',
        };

        // If it's a request, run AI analysis
        if (data.isRequest) {
            const aiResult = await this.analyticsService.analyzePurchaseRequest(companyId, purchaseData);
            if (aiResult) {
                purchaseData.aiDecision = aiResult.decision;
                purchaseData.aiConfidence = aiResult.confidence;
                purchaseData.aiReasoning = aiResult.explanation;
                purchaseData.aiFlags = aiResult.flags;
            }
        }

        return this.purchaseModel.create(purchaseData);
    }

    // ── CSV Preview: parse headers + auto-suggest mapping ────────
    previewCsv(csvContent: string) {
        const { headers, rows } = this.etl.parseCsv(csvContent);
        const suggestedMapping = this.etl.autoSuggestMapping(headers, 'purchase');
        const sampleRows = rows.slice(0, 5).map((values) => {
            const row: Record<string, string> = {};
            headers.forEach((h, i) => (row[h] = values[i] || ''));
            return row;
        });

        // Smart hints for UX
        const hints = this.etl.detectSmartHints(suggestedMapping, headers, 'purchase');
        const fieldInfo = this.etl.getFieldRequirements('purchase');

        // Dry-run transform to get quality preview
        const dryRun = this.etl.transformPurchases(headers, rows, suggestedMapping);

        return {
            headers,
            suggestedMapping,
            sampleRows,
            totalRows: rows.length,
            standardFields: ['date', 'supplier', 'item', 'category', 'quantity', 'unitCost', 'totalCost', 'status', 'notes'],
            fieldInfo,
            hints,
            quality: dryRun.quality,
            previewErrors: dryRun.errors.slice(0, 5),
            previewWarnings: dryRun.warnings.slice(0, 5),
            smartFixes: dryRun.smartFixes.slice(0, 5),
        };
    }

    // ── CSV Import with user-confirmed mapping ───────────────────
    async importCsvWithMapping(companyId: string, csvContent: string, mapping: ColumnMapping, isRequest = false, submittedBy = 'Owner'): Promise<{
        imported: number;
        errors: string[];
        warnings: string[];
        skipped: number;
        quality: any;
        smartFixes: string[];
    }> {
        const { headers, rows } = this.etl.parseCsv(csvContent);
        if (rows.length === 0) throw new BadRequestException('CSV has no data rows');

        const result = this.etl.transformPurchases(headers, rows, mapping);

        // Block import only if quality is dangerously poor
        if (result.quality.qualityPercent < 10 && result.rows.length === 0) {
            throw new BadRequestException(
                `No valid rows found. ${result.errors.length} errors detected. Please check your CSV format.`,
            );
        }

        const docs: any[] = result.rows.map((row) => ({
            companyId: new Types.ObjectId(companyId),
            date: row.date,
            supplier: row.supplier,
            category: row.category,
            item: row.item,
            quantity: row.quantity,
            unitCost: row.unitCost,
            totalCost: row.totalCost,
            status: isRequest ? 'pending_review' : (row.status || 'received'),
            notes: row.notes,
            submittedBy: submittedBy,
        }));

        // If it's a request, run AI analysis for each row (limited to 50 for performance)
        if (isRequest) {
            const analysisLimit = 50;
            const rowsToAnalyze = docs.slice(0, analysisLimit);
            
            await Promise.all(rowsToAnalyze.map(async (doc) => {
                const aiResult = await this.analyticsService.analyzePurchaseRequest(companyId, doc);
                if (aiResult) {
                    doc.aiDecision = aiResult.decision;
                    doc.aiConfidence = aiResult.confidence;
                    doc.aiReasoning = aiResult.explanation;
                    doc.aiFlags = aiResult.flags;
                }
            }));
        }

        // Auto-create suppliers from imported data (per-supplier isolation)
        const uniqueSuppliers = [...new Set(docs.map(d => d.supplier).filter(s => s && s !== 'Unknown'))];
        const supplierResults = await Promise.allSettled(
            uniqueSuppliers.map(name => this.suppliersService.findOrCreate(companyId, name)),
        );
        for (const r of supplierResults) {
            if (r.status === 'rejected') {
                console.warn('Supplier auto-create failed:', r.reason?.message || r.reason);
            }
        }

        if (docs.length) await this.purchaseModel.insertMany(docs);

        return {
            imported: docs.length,
            errors: result.errors,
            warnings: result.warnings,
            skipped: result.skippedRows,
            quality: result.quality,
            smartFixes: result.smartFixes,
        };
    }

    // ── Legacy CSV import (backward compatible) ──────────────────
    async importCsv(companyId: string, csvContent: string): Promise<{ imported: number; errors: string[] }> {
        const { headers } = this.etl.parseCsv(csvContent);
        const mapping = this.etl.autoSuggestMapping(headers, 'purchase');

        // Only truly required fields
        const requiredFields = ['date', 'item', 'quantity'];
        const mappedFields = Object.values(mapping);
        const missing = requiredFields.filter((f) => !mappedFields.includes(f));

        // Also need at least one cost field
        const hasCostField = mappedFields.includes('unitCost') || mappedFields.includes('totalCost');

        if (missing.length) {
            throw new BadRequestException(`Cannot auto-map required columns: ${missing.join(', ')}. Use the column mapping UI.`);
        }
        if (!hasCostField) {
            throw new BadRequestException('Cannot find a cost column (unitCost or totalCost). Use the column mapping UI.');
        }

        const result = await this.importCsvWithMapping(companyId, csvContent, mapping);
        return { imported: result.imported, errors: result.errors };
    }

    // ── Read ─────────────────────────────────────────────────────
    async findAll(companyId: string): Promise<Purchase[]> {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        // Exclude pending_review requests — they don't enter the DB until approved
        return this.purchaseModel.find({ companyId: cid, status: { $ne: 'pending_review' } }).sort({ date: -1 }).exec();
    }

    async delete(companyId: string, id: string): Promise<void> {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        await this.purchaseModel.deleteOne({ _id: id, companyId: cid }).exec();
    }

    // ── KPIs ─────────────────────────────────────────────────────
    async getKpis(companyId: string) {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        const [result] = await this.purchaseModel.aggregate([
            { $match: { companyId: cid, status: { $ne: 'pending_review' } } },
            {
                $group: {
                    _id: null,
                    totalPurchases: { $sum: '$totalCost' },
                    totalItems: { $sum: '$quantity' },
                    count: { $sum: 1 },
                    avgPurchaseValue: { $avg: '$totalCost' },
                    suppliers: { $addToSet: '$supplier' },
                },
            },
        ]);

        const [topSupplier] = await this.purchaseModel.aggregate([
            { $match: { companyId: cid, status: { $ne: 'pending_review' } } },
            { $group: { _id: '$supplier', total: { $sum: '$totalCost' } } },
            { $sort: { total: -1 } },
            { $limit: 1 },
        ]);

        return {
            totalPurchases: result?.totalPurchases || 0,
            totalItems: result?.totalItems || 0,
            count: result?.count || 0,
            avgPurchaseValue: Math.round((result?.avgPurchaseValue || 0) * 100) / 100,
            uniqueSuppliers: result?.suppliers?.length || 0,
            topSupplier: topSupplier?._id || 'N/A',
        };
    }

    // ── Charts ───────────────────────────────────────────────────
    async overTime(companyId: string, interval: string = 'day') {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        const dateFormat = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid, status: { $ne: 'pending_review' } } },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$date' } },
                    total: { $sum: '$totalCost' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    async bySupplier(companyId: string) {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid, status: { $ne: 'pending_review' } } },
            { $group: { _id: '$supplier', total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }

    async byCategory(companyId: string) {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid, status: { $ne: 'pending_review' } } },
            { $group: { _id: { $ifNull: ['$category', 'Uncategorized'] }, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }

    // ── OCR Image Upload ─────────────────────────────────────────────
    async uploadInvoiceImage(imageBuffer: Buffer, filename: string) {
        // Call Python OCR service
        const ocrResult = await this.ocr.extractFromImage(imageBuffer, filename);

        // Prepare rows with data quality assessment
        const rows = ocrResult.parsedRows || [];
        const assessedRows = rows.map(row => this.assessRowQuality(row, 'purchase'));

        // Calculate overall quality
        const validRows = assessedRows.filter(r => r.isValid);
        const invalidRows = assessedRows.filter(r => !r.isValid);
        const qualityPercent = rows.length > 0 ? Math.round((validRows.length / rows.length) * 100) : 0;

        // Determine quality status
        let qualityStatus = 'good';
        let qualityMessage = `Good quality (${qualityPercent}%)`;

        if (qualityPercent < 50) {
            qualityStatus = 'poor';
            qualityMessage = `Poor quality (${qualityPercent}%) - many rows need manual review`;
        } else if (qualityPercent < 80) {
            qualityStatus = 'warning';
            qualityMessage = `Fair quality (${qualityPercent}%) - some rows need review`;
        }

        return {
            rawText: ocrResult.text,
            rows: assessedRows,
            quality: {
                totalRows: rows.length,
                validRows: validRows.length,
                invalidRows: invalidRows.length,
                qualityPercent,
                status: qualityStatus,
                message: qualityMessage,
            },
            recommendation: {
                canProceed: qualityPercent >= 50,
                needsReview: qualityPercent < 80,
                hint: qualityPercent < 50
                    ? 'Too many missing values. Please add/edit rows manually.'
                    : qualityPercent < 80
                    ? 'Please review extracted values before saving.'
                    : 'Data looks good. Ready to save.',
            },
        };
    }

    // ── Confirm OCR Rows (ETL-validated) ────────────────────────────
    async confirmOcrRows(companyId: string, rows: any[], isRequest = false, submittedBy = 'Owner'): Promise<{
        imported: number;
        skipped: number;
        errors: string[];
        warnings: string[];
        quality: any;
    }> {
        if (!rows || rows.length === 0) {
            throw new BadRequestException('No rows to import');
        }

        const validDocs: any[] = [];
        const errors: string[] = [];
        const warnings: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;

            // Required: item, quantity, (totalCost OR unitCost)
            if (!row.item) { errors.push(`Row ${rowNum}: missing item name`); continue; }
            const quantity = Number(row.quantity);
            if (!quantity || quantity <= 0) { errors.push(`Row ${rowNum}: invalid quantity`); continue; }

            let unitCost = Number(row.unitCost) || 0;
            let totalCost = Number(row.totalCost) || 0;

            // Smart fallback
            if (unitCost > 0 && !totalCost) {
                totalCost = Math.round(unitCost * quantity * 100) / 100;
            } else if (totalCost > 0 && !unitCost && quantity > 0) {
                unitCost = Math.round(totalCost / quantity * 100) / 100;
            } else if (!unitCost && !totalCost) {
                errors.push(`Row ${rowNum}: missing both unitCost and totalCost`);
                continue;
            }

            const date = row.date ? new Date(row.date) : new Date();
            if (isNaN(date.getTime())) {
                warnings.push(`Row ${rowNum}: invalid date, using today`);
            }

            const doc: any = {
                companyId: new Types.ObjectId(companyId),
                date: isNaN(date.getTime()) ? new Date() : date,
                supplier: row.supplier || 'Unknown',
                category: row.category || '',
                item: row.item,
                quantity,
                unitCost,
                totalCost,
                status: isRequest ? 'pending_review' : 'received',
                notes: 'Imported from invoice image (OCR)',
                submittedBy: submittedBy,
            };

            // Run AI analysis if request
            if (isRequest) {
                const aiResult = await this.analyticsService.analyzePurchaseRequest(companyId, doc);
                if (aiResult) {
                    doc.aiDecision = aiResult.decision;
                    doc.aiConfidence = aiResult.confidence;
                    doc.aiReasoning = aiResult.explanation;
                    doc.aiFlags = aiResult.flags;
                }
            }

            validDocs.push(doc);
        }

        if (validDocs.length > 0) {
            // Auto-create suppliers from OCR data (non-blocking, per-supplier isolation)
            const uniqueSuppliers = [...new Set(validDocs.map(d => d.supplier).filter(s => s && s !== 'Unknown'))];
            const supplierResults = await Promise.allSettled(
                uniqueSuppliers.map(name => this.suppliersService.findOrCreate(companyId, name)),
            );
            for (const r of supplierResults) {
                if (r.status === 'rejected') {
                    console.warn('Supplier auto-create failed:', r.reason?.message || r.reason);
                }
            }

            await this.purchaseModel.insertMany(validDocs);
        }

        const totalRows = rows.length;
        const qualityPercent = totalRows > 0 ? Math.round((validDocs.length / totalRows) * 100) : 0;

        return {
            imported: validDocs.length,
            skipped: totalRows - validDocs.length,
            errors,
            warnings,
            quality: {
                totalRows,
                validRows: validDocs.length,
                invalidRows: totalRows - validDocs.length,
                qualityPercent,
                status: qualityPercent > 80 ? 'good' : qualityPercent >= 50 ? 'warning' : 'poor',
                message: `Imported ${validDocs.length} of ${totalRows} rows (${qualityPercent}% quality)`,
            },
        };
    }

    // ── Assess quality of individual row ──────────────────────────
    private assessRowQuality(row: any, type: 'sale' | 'purchase'): any {
        const assessed = { ...row };
        const issues: string[] = [];

        // Sales: required = product, quantity, date, (totalAmount OR unitPrice)
        if (type === 'sale') {
            if (!row.product) issues.push('Missing product name');
            if (!row.quantity || row.quantity <= 0) issues.push('Invalid quantity');
            if (!row.date) issues.push('Missing date');

            // Check price fields
            const hasAmount = row.totalAmount && row.totalAmount > 0;
            const hasUnitPrice = row.unitPrice && row.unitPrice > 0;
            if (!hasAmount && !hasUnitPrice) issues.push('Missing price (totalAmount or unitPrice)');

            // Apply smart fixes
            const q = row.quantity || 1;
            const up = row.unitPrice || 0;
            const ta = row.totalAmount || 0;

            if (hasUnitPrice && !hasAmount) {
                assessed.totalAmount = Math.round(q * up * 100) / 100;
            } else if (hasAmount && !hasUnitPrice && q > 0) {
                assessed.unitPrice = Math.round((ta / q) * 100) / 100;
            }
        }

        // Purchase: required = item, quantity, (totalCost OR unitCost)
        if (type === 'purchase') {
            if (!row.item) issues.push('Missing item name');
            if (!row.quantity || row.quantity <= 0) issues.push('Invalid quantity');

            const hasTotal = row.totalCost && row.totalCost > 0;
            const hasUnit = row.unitCost && row.unitCost > 0;
            if (!hasTotal && !hasUnit) issues.push('Missing price (totalCost or unitCost)');

            // Apply smart fixes
            const q = row.quantity || 1;
            const uc = row.unitCost || 0;
            const tc = row.totalCost || 0;

            if (hasUnit && !hasTotal) {
                assessed.totalCost = Math.round(q * uc * 100) / 100;
            } else if (hasTotal && !hasUnit && q > 0) {
                assessed.unitCost = Math.round((tc / q) * 100) / 100;
            }
        }

        assessed.isValid = issues.length === 0;
        assessed.issues = issues;

        return assessed;
    }

    // ── Accountant & History Features ─────────────────────────────
    async findRequests(companyId: string, filters: any = {}): Promise<Purchase[]> {
        const query: any = { 
            companyId: Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId, 
            status: 'pending_review' 
        };
        
        // Add more filters if needed (date, employee, category, etc.)
        if (filters.employee) query.submittedBy = filters.employee;
        if (filters.category) query.category = filters.category;
        if (filters.startDate || filters.endDate) {
            query.date = {};
            if (filters.startDate) query.date.$gte = new Date(filters.startDate);
            if (filters.endDate) query.date.$lte = new Date(filters.endDate);
        }

        return this.purchaseModel.find(query).sort({ createdAt: -1 }).exec();
    }

    async getHistory(companyId: string, filters: any = {}): Promise<Purchase[]> {
        const query: any = { 
            companyId: Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId 
        };
        
        if (filters.status) query.finalStatus = filters.status;
        if (filters.employee) query.submittedBy = filters.employee;
        if (filters.category) query.category = filters.category;
        
        return this.purchaseModel.find(query).sort({ date: -1 }).exec();
    }

    async reviewRequest(companyId: string, id: string, review: { status: 'APPROVED' | 'REJECTED', comment?: string }): Promise<Purchase | null> {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;

        if (review.status === 'REJECTED') {
            // Hard-delete on rejection — data never enters the real DB flow
            await this.purchaseModel.deleteOne({ _id: id, companyId: cid }).exec();
            return null;
        }

        // APPROVED: update status to 'received' so it enters normal data flow
        const update: any = {
            finalStatus: 'APPROVED',
            accountantComment: review.comment || '',
            reviewedAt: new Date(),
            status: 'received',
        };

        return this.purchaseModel.findOneAndUpdate(
            { _id: id, companyId: cid },
            { $set: update },
            { new: true }
        ).exec();
    }

    async getReviewStats(companyId: string) {
        const cid = Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
        const stats = await this.purchaseModel.aggregate([
            { $match: { companyId: cid, finalStatus: { $ne: 'PENDING' } } },
            {
                $group: {
                    _id: null,
                    totalReviewed: { $sum: 1 },
                    approved: { $sum: { $cond: [{ $eq: ['$finalStatus', 'APPROVED'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$finalStatus', 'REJECTED'] }, 1, 0] } },
                    aiMatches: { $sum: { $cond: [{ $eq: ['$aiDecision', '$finalStatus'] }, 1, 0] } },
                }
            }
        ]);

        const result = stats[0] || { totalReviewed: 0, approved: 0, rejected: 0, aiMatches: 0 };
        return {
            ...result,
            accuracy: result.totalReviewed > 0 ? Math.round((result.aiMatches / result.totalReviewed) * 100) : 100
        };
    }
}

