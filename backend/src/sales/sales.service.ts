import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { EtlService, ColumnMapping } from '../etl/etl.service';
import { OcrService } from '../ocr/ocr.service';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class SalesService {
    constructor(
        @InjectModel(Sale.name)
        private readonly saleModel: Model<SaleDocument>,
        private readonly etl: EtlService,
        private readonly ocr: OcrService,
        private readonly customersService: CustomersService,
    ) { }

    // ── Create single sale (manual entry) ────────────────────────
    async create(companyId: string, data: any): Promise<Sale> {
        // Smart: compute whichever is missing
        let unitPrice = data.unitPrice ?? 0;
        let totalAmount = data.totalAmount ?? 0;
        const quantity = data.quantity || 0;

        if (totalAmount && !unitPrice && quantity > 0) {
            unitPrice = totalAmount / quantity;
        } else if (unitPrice && !totalAmount) {
            totalAmount = quantity * unitPrice;
        } else if (!totalAmount) {
            totalAmount = quantity * unitPrice;
        }

        // Auto-create customer if new
        const customerName = data.customer || 'Unknown';
        try {
            await this.customersService.findOrCreate(companyId, customerName);
        } catch (e: any) {
            console.warn('Customer auto-create failed:', e?.message || e);
        }

        return this.saleModel.create({
            companyId: new Types.ObjectId(companyId),
            date: data.date ? new Date(data.date) : new Date(),
            customer: customerName,
            product: data.product,
            category: data.category || '',
            quantity,
            unitPrice,
            totalAmount,
            status: data.status || 'confirmed',
            notes: data.notes || '',
        });
    }

    // ── CSV Preview: parse headers + auto-suggest mapping ────────
    previewCsv(csvContent: string) {
        const { headers, rows } = this.etl.parseCsv(csvContent);
        const suggestedMapping = this.etl.autoSuggestMapping(headers, 'sale');
        const sampleRows = rows.slice(0, 5).map((values) => {
            const row: Record<string, string> = {};
            headers.forEach((h, i) => (row[h] = values[i] || ''));
            return row;
        });

        // Smart hints for UX
        const hints = this.etl.detectSmartHints(suggestedMapping, headers, 'sale');
        const fieldInfo = this.etl.getFieldRequirements('sale');

        // Dry-run transform to get quality preview
        const dryRun = this.etl.transformSales(headers, rows, suggestedMapping);

        return {
            headers,
            suggestedMapping,
            sampleRows,
            totalRows: rows.length,
            standardFields: ['date', 'customer', 'product', 'category', 'quantity', 'unitPrice', 'totalAmount', 'status', 'notes'],
            fieldInfo,
            hints,
            quality: dryRun.quality,
            previewErrors: dryRun.errors.slice(0, 5),
            previewWarnings: dryRun.warnings.slice(0, 5),
            smartFixes: dryRun.smartFixes.slice(0, 5),
        };
    }

    // ── CSV Import with user-confirmed mapping ───────────────────
    async importCsvWithMapping(companyId: string, csvContent: string, mapping: ColumnMapping): Promise<{
        imported: number;
        errors: string[];
        warnings: string[];
        skipped: number;
        quality: any;
        smartFixes: string[];
    }> {
        const { headers, rows } = this.etl.parseCsv(csvContent);
        if (rows.length === 0) throw new BadRequestException('CSV has no data rows');

        const result = this.etl.transformSales(headers, rows, mapping);

        // Block import only if quality is dangerously poor (< 10%)
        if (result.quality.qualityPercent < 10 && result.rows.length === 0) {
            throw new BadRequestException(
                `No valid rows found. ${result.errors.length} errors detected. Please check your CSV format.`,
            );
        }

        const docs = result.rows.map((row) => ({
            companyId: new Types.ObjectId(companyId),
            date: row.date,
            customer: row.customer,
            product: row.product,
            category: row.category,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            totalAmount: row.totalAmount,
            status: row.status,
            notes: row.notes,
        }));

        // Auto-create customers from imported data (non-blocking, per-customer isolation)
        const uniqueCustomers = [...new Set(docs.map(d => d.customer).filter(c => c && c !== 'Unknown'))];
        const customerResults = await Promise.allSettled(
            uniqueCustomers.map(name => this.customersService.findOrCreate(companyId, name)),
        );
        for (const r of customerResults) {
            if (r.status === 'rejected') {
                console.warn('Customer auto-create failed:', r.reason?.message || r.reason);
            }
        }

        if (docs.length) await this.saleModel.insertMany(docs);

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
        const mapping = this.etl.autoSuggestMapping(headers, 'sale');

        // Only truly required fields: date, product, quantity (+ at least one price field)
        const requiredFields = ['date', 'product', 'quantity'];
        const mappedFields = Object.values(mapping);
        const missing = requiredFields.filter((f) => !mappedFields.includes(f));

        // Also need at least one price field
        const hasPriceField = mappedFields.includes('unitPrice') || mappedFields.includes('totalAmount');

        if (missing.length) {
            throw new BadRequestException(`Cannot auto-map required columns: ${missing.join(', ')}. Use the column mapping UI.`);
        }
        if (!hasPriceField) {
            throw new BadRequestException('Cannot find a price column (unitPrice or totalAmount). Use the column mapping UI.');
        }

        const result = await this.importCsvWithMapping(companyId, csvContent, mapping);
        return { imported: result.imported, errors: result.errors };
    }

    // ── Read ─────────────────────────────────────────────────────
    async findAll(companyId: string): Promise<Sale[]> {
        return this.saleModel.find({ companyId: new Types.ObjectId(companyId) }).sort({ date: -1 }).exec();
    }

    async delete(companyId: string, id: string): Promise<void> {
        await this.saleModel.deleteOne({ _id: id, companyId: new Types.ObjectId(companyId) }).exec();
    }

    // ── KPIs ─────────────────────────────────────────────────────
    async getKpis(companyId: string) {
        const cid = new Types.ObjectId(companyId);
        const [result] = await this.saleModel.aggregate([
            { $match: { companyId: cid } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalItems: { $sum: '$quantity' },
                    count: { $sum: 1 },
                    avgOrderValue: { $avg: '$totalAmount' },
                    customers: { $addToSet: '$customer' },
                },
            },
        ]);

        const [topProduct] = await this.saleModel.aggregate([
            { $match: { companyId: cid } },
            { $group: { _id: '$product', total: { $sum: '$totalAmount' } } },
            { $sort: { total: -1 } },
            { $limit: 1 },
        ]);

        return {
            totalRevenue: result?.totalRevenue || 0,
            totalItems: result?.totalItems || 0,
            count: result?.count || 0,
            avgOrderValue: Math.round((result?.avgOrderValue || 0) * 100) / 100,
            uniqueCustomers: result?.customers?.length || 0,
            topProduct: topProduct?._id || 'N/A',
        };
    }

    // ── Charts ───────────────────────────────────────────────────
    async revenueOverTime(companyId: string, interval: string = 'day') {
        const cid = new Types.ObjectId(companyId);
        const dateFormat = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';
        return this.saleModel.aggregate([
            { $match: { companyId: cid } },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$date' } },
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }

    async revenueByProduct(companyId: string) {
        const cid = new Types.ObjectId(companyId);
        return this.saleModel.aggregate([
            { $match: { companyId: cid } },
            { $group: { _id: '$product', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
        ]);
    }

    async revenueByCustomer(companyId: string) {
        const cid = new Types.ObjectId(companyId);
        return this.saleModel.aggregate([
            { $match: { companyId: cid } },
            { $group: { _id: '$customer', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
        ]);
    }

    // ── OCR Image Upload ─────────────────────────────────────────────
    async uploadInvoiceImage(imageBuffer: Buffer, filename: string) {
        // Call Python OCR service
        const ocrResult = await this.ocr.extractFromImage(imageBuffer, filename);

        // Prepare rows with data quality assessment
        const rows = ocrResult.parsedRows || [];
        const assessedRows = rows.map(row => this.assessRowQuality(row, 'sale'));

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
    async confirmOcrRows(companyId: string, rows: any[]): Promise<{
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

            // Required: product, quantity, date, (totalAmount OR unitPrice)
            if (!row.product) { errors.push(`Row ${rowNum}: missing product name`); continue; }
            const quantity = Number(row.quantity);
            if (!quantity || quantity <= 0) { errors.push(`Row ${rowNum}: invalid quantity`); continue; }

            let unitPrice = Number(row.unitPrice) || 0;
            let totalAmount = Number(row.totalAmount) || 0;

            // Smart fallback
            if (unitPrice > 0 && !totalAmount) {
                totalAmount = Math.round(unitPrice * quantity * 100) / 100;
            } else if (totalAmount > 0 && !unitPrice && quantity > 0) {
                unitPrice = Math.round(totalAmount / quantity * 100) / 100;
            } else if (!unitPrice && !totalAmount) {
                errors.push(`Row ${rowNum}: missing both unitPrice and totalAmount`);
                continue;
            }

            // ML safety: must have product + quantity + totalAmount + date
            const date = row.date ? new Date(row.date) : new Date();
            if (isNaN(date.getTime())) {
                warnings.push(`Row ${rowNum}: invalid date, using today`);
            }

            validDocs.push({
                companyId: new Types.ObjectId(companyId),
                date: isNaN(date.getTime()) ? new Date() : date,
                customer: row.customer || 'Unknown',
                product: row.product,
                category: row.category || '',
                quantity,
                unitPrice,
                totalAmount,
                status: 'confirmed',
                notes: 'Imported from invoice image (OCR)',
            });
        }

        if (validDocs.length > 0) {
            // Auto-create customers from OCR data (non-blocking, per-customer isolation)
            const uniqueCustomers = [...new Set(validDocs.map(d => d.customer).filter(c => c && c !== 'Unknown'))];
            const customerResults = await Promise.allSettled(
                uniqueCustomers.map(name => this.customersService.findOrCreate(companyId, name)),
            );
            for (const r of customerResults) {
                if (r.status === 'rejected') {
                    console.warn('Customer auto-create failed:', r.reason?.message || r.reason);
                }
            }

            await this.saleModel.insertMany(validDocs);
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
}

