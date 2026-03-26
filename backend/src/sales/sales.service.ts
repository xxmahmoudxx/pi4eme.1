import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';

@Injectable()
export class SalesService {
    constructor(
        @InjectModel(Sale.name)
        private readonly saleModel: Model<SaleDocument>,
    ) { }

    // ── Create single sale (manual entry) ────────────────────────
    async create(companyId: string, data: any): Promise<Sale> {
        const totalAmount = (data.quantity || 0) * (data.unitPrice || 0);
        return this.saleModel.create({
            companyId: new Types.ObjectId(companyId),
            date: data.date ? new Date(data.date) : new Date(),
            customer: data.customer,
            product: data.product,
            category: data.category || '',
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            totalAmount,
            status: data.status || 'confirmed',
            notes: data.notes || '',
        });
    }

    // ── CSV import ───────────────────────────────────────────────
    async importCsv(companyId: string, csvContent: string): Promise<{ imported: number; errors: string[] }> {
        const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const required = ['date', 'customer', 'product', 'quantity', 'unitprice'];
        const missing = required.filter((r) => !header.includes(r));
        if (missing.length) throw new BadRequestException(`Missing required columns: ${missing.join(', ')}`);

        const errors: string[] = [];
        const docs: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            const row: any = {};
            header.forEach((h, idx) => (row[h] = values[idx] || ''));

            const qty = parseFloat(row.quantity);
            const price = parseFloat(row.unitprice);

            if (!row.date || !row.customer || !row.product) {
                errors.push(`Row ${i + 1}: missing required field (date, customer, or product)`);
                continue;
            }
            if (isNaN(qty) || qty < 0) {
                errors.push(`Row ${i + 1}: invalid quantity "${row.quantity}"`);
                continue;
            }
            if (isNaN(price) || price < 0) {
                errors.push(`Row ${i + 1}: invalid unitPrice "${row.unitprice}"`);
                continue;
            }

            docs.push({
                companyId: new Types.ObjectId(companyId),
                date: new Date(row.date),
                customer: row.customer,
                product: row.product,
                category: row.category || '',
                quantity: qty,
                unitPrice: price,
                totalAmount: qty * price,
                status: row.status || 'confirmed',
                notes: row.notes || '',
            });
        }

        if (docs.length) await this.saleModel.insertMany(docs);
        return { imported: docs.length, errors };
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

        // Top product
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
