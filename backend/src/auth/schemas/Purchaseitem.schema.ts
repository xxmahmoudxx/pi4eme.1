import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({ collection: 'purchase_items', timestamps: true })
export class PurchaseItem {
  // Relation to Achat
  @Prop({ type: Types.ObjectId, ref: 'Achat', required: true })
  achatId: Types.ObjectId;

  // Relation to Supplier
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Types.ObjectId;


  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  cost: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  totalCost: number;
}

export type PurchaseItemDocument = PurchaseItem & Document;
export const PurchaseItemSchema = SchemaFactory.createForClass(PurchaseItem);