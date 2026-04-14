import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'customers', timestamps: true })
export class Customer {
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

export type CustomerDocument = Customer & Document;
export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Text index for fast search
CustomerSchema.index({ name: 'text' });
