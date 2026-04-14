import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'suppliers', timestamps: true })
export class Supplier {
    @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
    companyId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ default: '' })
    email: string;

    @Prop({ default: '' })
    phone: string;

    @Prop()
    createdAt: Date;
}

export type SupplierDocument = Supplier & Document;
export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Text index for fast search
SupplierSchema.index({ name: 'text' });
