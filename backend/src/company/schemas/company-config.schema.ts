import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'company_config', timestamps: true })
export class CompanyConfig {
  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  taxRate: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  email: string;
}

export type CompanyConfigDocument = CompanyConfig & Document;
export const CompanyConfigSchema = SchemaFactory.createForClass(CompanyConfig);
