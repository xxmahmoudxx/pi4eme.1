import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectModel(Purchase.name)
        private readonly purchaseModel: Model<PurchaseDocument>,
    ) { }

    // ── Create single purchase (manual entry) ────────────────────
    async create(companyId: string, data: any): Promise<Purchase> {
        const totalCost = (data.quantity || 0) * (data.unitCost || 0);
        return this.purchaseModel.create({
            companyId: new Types.ObjectId(companyId),
            date: data.date ? new Date(data.date) : new Date(),
            supplier: data.supplier,
            category: data.category || '',
            item: data.item,
            quantity: data.quantity,
            unitCost: data.unitCost,
            totalCost,
            status: data.status || 'received',
            notes: data.notes || '',
        });
    }

    // ── CSV import ───────────────────────────────────────────────
    async importCsv(companyId: string, csvContent: string): Promise<{ imported: number; errors: string[] }> {
        const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const required = ['date', 'supplier', 'item', 'quantity', 'unitcost'];
        const missing = required.filter((r) => !header.includes(r));
        if (missing.length) throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);

        const errors: string[] = [];
        const docs: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            const row: any = {};
            header.forEach((h, idx) => (row[h] = values[idx] || ''));

            const qty = parseFloat(row.quantity);
            const cost = parseFloat(row.unitcost);

            if (!row.date || !row.supplier || !row.item) {
                errors.push(`Row ${i + 1}: missing required field (date, supplier, or item)`);
                continue;
            }
            if (isNaN(qty) || qty < 0) {
                errors.push(`Row ${i + 1}: invalid quantity "${row.quantity}"`);
                continue;
            }
            if (isNaN(cost) || cost < 0) {
                errors.push(`Row ${i + 1}: invalid unitCost "${row.unitcost}"`);
                continue;
            }

            docs.push({
                companyId: new Types.ObjectId(companyId),
                date: new Date(row.date),
                supplier: row.supplier,
                category: row.category || '',
                item: row.item,
                quantity: qty,
                unitCost: cost,
                totalCost: qty * cost,
                status: row.status || 'received',
                notes: row.notes || '',
            });
        }

        if (docs.length) await this.purchaseModel.insertMany(docs);
        return { imported: docs.length, errors };
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

        // Top supplier
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
