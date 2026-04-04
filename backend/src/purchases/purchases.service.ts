import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { EtlService, ColumnMapping } from '../etl/etl.service';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectModel(Purchase.name)
        private readonly purchaseModel: Model<PurchaseDocument>,
        private readonly etl: EtlService,
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

        return this.purchaseModel.create({
            companyId: new Types.ObjectId(companyId),
            date: data.date ? new Date(data.date) : new Date(),
            supplier: data.supplier || 'Unknown',
            category: data.category || '',
            item: data.item,
            quantity,
            unitCost,
            totalCost,
            status: data.status || 'received',
            notes: data.notes || '',
        });
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

        const result = this.etl.transformPurchases(headers, rows, mapping);

        // Block import only if quality is dangerously poor
        if (result.quality.qualityPercent < 10 && result.rows.length === 0) {
            throw new BadRequestException(
                `No valid rows found. ${result.errors.length} errors detected. Please check your CSV format.`,
            );
        }

        const docs = result.rows.map((row) => ({
            companyId: new Types.ObjectId(companyId),
            date: row.date,
            supplier: row.supplier,
            category: row.category,
            item: row.item,
            quantity: row.quantity,
            unitCost: row.unitCost,
            totalCost: row.totalCost,
            status: row.status,
            notes: row.notes,
        }));

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
        return this.purchaseModel.find({ companyId: new Types.ObjectId(companyId) }).sort({ date: -1 }).exec();
    }

    async delete(companyId: string, id: string): Promise<void> {
        await this.purchaseModel.deleteOne({ _id: id, companyId: new Types.ObjectId(companyId) }).exec();
    }

    // ── KPIs ─────────────────────────────────────────────────────
    async getKpis(companyId: string) {
        const cid = new Types.ObjectId(companyId);
        const [result] = await this.purchaseModel.aggregate([
            { $match: { companyId: cid } },
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
            { $match: { companyId: cid } },
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
        const cid = new Types.ObjectId(companyId);
        const dateFormat = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid } },
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
        const cid = new Types.ObjectId(companyId);
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid } },
            { $group: { _id: '$supplier', total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }

    async byCategory(companyId: string) {
        const cid = new Types.ObjectId(companyId);
        return this.purchaseModel.aggregate([
            { $match: { companyId: cid } },
            { $group: { _id: { $ifNull: ['$category', 'Uncategorized'] }, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]);
    }
}
