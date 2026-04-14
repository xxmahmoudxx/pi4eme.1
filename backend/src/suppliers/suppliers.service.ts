import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';

@Injectable()
export class SuppliersService {
    constructor(
        @InjectModel(Supplier.name)
        private readonly supplierModel: Model<SupplierDocument>,
    ) { }

    // ── Create ────────────────────────────────────────────────────
    async create(companyId: string, data: any): Promise<Supplier> {
        return this.supplierModel.create({
            companyId: new Types.ObjectId(companyId),
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
        });
    }

    // ── Find All ──────────────────────────────────────────────────
    async findAll(companyId: string): Promise<Supplier[]> {
        return this.supplierModel
            .find({ companyId: new Types.ObjectId(companyId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    // ── Update ────────────────────────────────────────────────────
    async update(companyId: string, id: string, data: any): Promise<Supplier | null> {
        return this.supplierModel.findOneAndUpdate(
            { _id: id, companyId: new Types.ObjectId(companyId) },
            { $set: { name: data.name, email: data.email || '', phone: data.phone || '' } },
            { new: true },
        ).exec();
    }

    // ── Delete ────────────────────────────────────────────────────
    async delete(companyId: string, id: string): Promise<void> {
        await this.supplierModel.deleteOne({
            _id: id,
            companyId: new Types.ObjectId(companyId),
        }).exec();
    }

    // ── Search (Autocomplete) ─────────────────────────────────────
    async search(companyId: string, query: string): Promise<Supplier[]> {
        if (!query || query.trim().length === 0) {
            return this.supplierModel
                .find({ companyId: new Types.ObjectId(companyId) })
                .sort({ name: 1 })
                .limit(10)
                .exec();
        }

        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return this.supplierModel
            .find({
                companyId: new Types.ObjectId(companyId),
                name: { $regex: regex },
            })
            .sort({ name: 1 })
            .limit(10)
            .exec();
    }

    // ── Find or Create (for auto-create on purchase) ──────────────
    async findOrCreate(companyId: string, name: string): Promise<Supplier> {
        if (!name || name.trim() === '' || name.toLowerCase() === 'unknown') {
            return null as any;
        }

        const cid = new Types.ObjectId(companyId);
        const existing = await this.supplierModel.findOne({
            companyId: cid,
            name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        }).exec();

        if (existing) return existing;

        return this.supplierModel.create({
            companyId: cid,
            name: name.trim(),
            email: '',
            phone: '',
        });
    }
}
