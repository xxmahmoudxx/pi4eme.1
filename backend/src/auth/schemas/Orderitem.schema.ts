import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({ collection: 'order_items', timestamps: true })
export class OrderItem {
  // Relation to Commande
  @Prop({ type: Types.ObjectId, ref: 'Commande', required: true })
  commandeId: Types.ObjectId;

  // Many-to-Many with Products
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  productIds: Types.ObjectId[];


  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  priceTotal: number;
}

export type OrderItemDocument = OrderItem & Document;
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);