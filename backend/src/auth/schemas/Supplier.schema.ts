import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'suppliers', timestamps: true })
export class Supplier {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;


 // Supplier (1) ──provides──► (*) PurchaseItem

  @Prop({ type: [{ type: Types.ObjectId, ref: 'PurchaseItem' }] })
  purchaseItems: Types.ObjectId[];
}

export type SupplierDocument = Supplier & Document;
export const SupplierSchema = SchemaFactory.createForClass(Supplier);