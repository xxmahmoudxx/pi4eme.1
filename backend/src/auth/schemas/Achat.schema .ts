import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type AchatStatus = 'pending' | 'received' | 'cancelled';

@Schema({ collection: 'achats', timestamps: true })
export class Achat {


  @Prop({ default: Date.now })
  purchaseDate: Date;

  @Prop({
    required: true,
    enum: ['pending', 'received', 'cancelled'],
    default: 'pending',
  })
  status: AchatStatus;

  @Prop({ required: true })
  totalCost: number;

  // Many-to-Many with Product
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }] })
  productIds: Types.ObjectId[];

  // One-to-Many with PurchaseItem
  @Prop({ type: [{ type: Types.ObjectId, ref: 'PurchaseItem' }] })
  purchaseItems: Types.ObjectId[];
}

export type AchatDocument = Achat & Document;
export const AchatSchema = SchemaFactory.createForClass(Achat);