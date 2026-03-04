import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'stocks', timestamps: true })
export class Stock {

  // 1 Stock → 1 Product (unique garantit le 1–1)
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true,
  })
  product: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  quantityAvailable: number;

  @Prop({ type: Date, default: null })
  lastUpdate: Date | null;

  // Stock (*) ──────► (1) Company
  @Prop({
    type: Types.ObjectId,
    ref: 'Company',
    required: true,
  })
  company: Types.ObjectId;
}

export type StockDocument = Stock & Document;
export const StockSchema = SchemaFactory.createForClass(Stock);