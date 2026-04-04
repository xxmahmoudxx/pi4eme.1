import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { EtlService, ColumnMapping } from '../etl/etl.service';

@Injectable()
export class SalesService {
    constructor(
        @InjectModel(Sale.name)
        private readonly saleModel: Model<SaleDocument>,
        private readonly etl: EtlService,
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

        return this.saleModel.create({
            companyId: new Types.ObjectId(companyId),
            date: data.date ? new Date(data.date) : new Date(),
            customer: data.customer || 'Unknown',
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
}
