import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


export type CommandeStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

@Schema({ collection: 'commandes', timestamps: true })
export class Commande {
  // Commande (*) ──────► (1) Client
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;


  @Prop({ default: Date.now })
  orderDate: Date;

  @Prop({
    required: true,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  })
  status: CommandeStatus;

  @Prop({ required: true })
  totalAmount: number;
  // Commande (1) ──includes──► (*) OrderItem
  @Prop({ type: [{ type: Types.ObjectId, ref: 'OrderItem' }] })
  orderItems: Types.ObjectId[];
}

export type CommandeDocument = Commande & Document;
export const CommandeSchema = SchemaFactory.createForClass(Commande);