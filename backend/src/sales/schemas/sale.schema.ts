import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

@Schema({ collection: 'sales_flat', timestamps: true })
export class Sale {
    @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
    companyId: Types.ObjectId;

    @Prop({ required: true })
    date: Date;

    @Prop({ default: 'Unknown' })
    customer: string;

    @Prop({ required: true })
    product: string;

    @Prop({ default: '' })
    category: string;

    @Prop({ required: true, min: 0 })
    quantity: number;

    @Prop({ default: 0, min: 0 })
    unitPrice: number;

    @Prop({ required: true, min: 0 })
    totalAmount: number;

    @Prop({
        required: true,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'confirmed',
    })
    status: SaleStatus;

    @Prop({ default: '' })
    notes: string;
}

export type SaleDocument = Sale & Document;
export const SaleSchema = SchemaFactory.createForClass(Sale);
