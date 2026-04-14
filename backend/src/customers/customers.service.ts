import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
    constructor(
        @InjectModel(Customer.name)
        private readonly customerModel: Model<CustomerDocument>,
    ) { }

    // ── Create ────────────────────────────────────────────────────
    async create(companyId: string, data: any): Promise<Customer> {
        return this.customerModel.create({
            companyId: new Types.ObjectId(companyId),
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
        });
    }

    // ── Find All ──────────────────────────────────────────────────
    async findAll(companyId: string): Promise<Customer[]> {
        return this.customerModel
            .find({ companyId: new Types.ObjectId(companyId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    // ── Update ────────────────────────────────────────────────────
    async update(companyId: string, id: string, data: any): Promise<Customer | null> {
        return this.customerModel.findOneAndUpdate(
            { _id: id, companyId: new Types.ObjectId(companyId) },
            { $set: { name: data.name, email: data.email || '', phone: data.phone || '' } },
            { new: true },
        ).exec();
    }

    // ── Delete ────────────────────────────────────────────────────
    async delete(companyId: string, id: string): Promise<void> {
        await this.customerModel.deleteOne({
            _id: id,
            companyId: new Types.ObjectId(companyId),
        }).exec();
    }

    // ── Search (Autocomplete) ─────────────────────────────────────
    async search(companyId: string, query: string): Promise<Customer[]> {
        if (!query || query.trim().length === 0) {
            return this.customerModel
                .find({ companyId: new Types.ObjectId(companyId) })
                .sort({ name: 1 })
                .limit(10)
                .exec();
        }

        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return this.customerModel
            .find({
                companyId: new Types.ObjectId(companyId),
                name: { $regex: regex },
            })
            .sort({ name: 1 })
            .limit(10)
            .exec();
    }

    // ── Find or Create (for auto-create on sale) ──────────────────
    async findOrCreate(companyId: string, name: string): Promise<Customer> {
        if (!name || name.trim() === '' || name.toLowerCase() === 'unknown') {
            // Don't create for empty/unknown names
            return null as any;
        }

        const cid = new Types.ObjectId(companyId);
        const existing = await this.customerModel.findOne({
            companyId: cid,
            name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        }).exec();

        if (existing) return existing;

        return this.customerModel.create({
            companyId: cid,
            name: name.trim(),
            email: '',
            phone: '',
        });
    }
}
