import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseStatus = 'pending' | 'received' | 'cancelled' | 'pending_review';

@Schema({ collection: 'purchases_flat', timestamps: true })
export class Purchase {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: 'Unknown' })
  supplier: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ required: true })
  item: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ default: 0, min: 0 })
  unitCost: number;

  @Prop({ required: true, min: 0 })
  totalCost: number;

  @Prop({
    required: true,
    enum: ['pending', 'received', 'cancelled', 'pending_review'],
    default: 'received',
  })
  status: PurchaseStatus;

  @Prop({ default: '' })
  notes: string;

  // AI Decision Fields
  @Prop({ type: String, enum: ['APPROVED', 'REJECTED'], default: null })
  aiDecision: string;

  @Prop({ type: Number, default: 0 })
  aiConfidence: number;

  @Prop({ type: String, default: '' })
  aiReasoning: string;

  @Prop({ type: [String], default: [] })
  aiFlags: string[];

  // Accountant Review Fields
  @Prop({ type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' })
  finalStatus: string;

  @Prop({ type: String, default: '' })
  accountantComment: string;

  @Prop({ type: Date, default: null })
  reviewedAt: Date;

  @Prop({ type: String, default: '' })
  submittedBy: string;
}

export type PurchaseDocument = Purchase & Document;
export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
