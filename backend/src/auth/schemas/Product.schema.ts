import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'products', timestamps: true })
export class Product {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  salePrice: number;

  // Product (*) ──────► (1) Company
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  company: Types.ObjectId;

  // Product (*) ──────► (1) Category
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  // Si tu as un Stock séparé (1–1)
  @Prop({ type: Types.ObjectId, ref: 'Stock' })
  stock: Types.ObjectId;

}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);