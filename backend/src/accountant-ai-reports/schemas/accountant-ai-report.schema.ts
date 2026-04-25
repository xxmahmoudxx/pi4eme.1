import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const ACCOUNTANT_AI_REPORT_STATUSES = [
  'DRAFT_GENERATED',
  'EDITED',
  'APPROVED',
  'SENT',
  'FAILED_TO_SEND',
] as const;

export type AccountantAiReportStatus = (typeof ACCOUNTANT_AI_REPORT_STATUSES)[number];

@Schema({ _id: false })
export class AccountantAiReportCitation {
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ default: '' })
  source: string;

  @Prop({ default: '' })
  snippet: string;
}

@Schema({ _id: false })
export class AccountantAiReportStatusHistory {
  @Prop({ required: true, enum: ACCOUNTANT_AI_REPORT_STATUSES })
  status: AccountantAiReportStatus;

  @Prop({ default: '' })
  changedByUserId: string;

  @Prop({ default: Date.now })
  changedAt: Date;

  @Prop({ default: '' })
  note: string;
}

@Schema({ _id: false })
export class AccountantAiReportAuditEvent {
  @Prop({ required: true })
  action: string;

  @Prop({ default: '' })
  byUserId: string;

  @Prop({ default: Date.now })
  at: Date;

  @Prop({ type: Object, default: {} })
  meta: Record<string, any>;
}

@Schema({ collection: 'accountant_ai_reports', timestamps: true })
export class AccountantAiReport {
  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true, index: true })
  createdByUserId: string;

  @Prop({ default: null })
  ownerUserId: string | null;

  @Prop({ required: true })
  ownerEmail: string;

  @Prop({ required: true, enum: ACCOUNTANT_AI_REPORT_STATUSES })
  status: AccountantAiReportStatus;

  @Prop({ default: '' })
  aiDraft: string;

  @Prop({ default: '' })
  editedDraft: string;

  @Prop({ default: '' })
  finalApprovedText: string;

  @Prop({ default: '' })
  shortEmailSummary: string;

  @Prop({ type: Object, default: {} })
  sections: Record<string, any>;

  @Prop({ type: [AccountantAiReportCitation], default: [] })
  citations: AccountantAiReportCitation[];

  @Prop({ default: false })
  usedWebResearch: boolean;

  @Prop({ default: Date.now })
  generatedAt: Date;

  @Prop({ default: null })
  approvedBy: string | null;

  @Prop({ default: null })
  approvedAt: Date | null;

  @Prop({ default: null })
  sentAt: Date | null;

  @Prop({ default: 'PENDING' })
  emailStatus: 'PENDING' | 'SENT' | 'FAILED';

  @Prop({ default: null })
  pdfPath: string | null;

  @Prop({ type: [String], default: [] })
  generationErrors: string[];

  @Prop({ type: [String], default: [] })
  sendErrors: string[];

  @Prop({ type: [AccountantAiReportStatusHistory], default: [] })
  statusHistory: AccountantAiReportStatusHistory[];

  @Prop({ type: [AccountantAiReportAuditEvent], default: [] })
  auditTrail: AccountantAiReportAuditEvent[];
}

export type AccountantAiReportDocument = AccountantAiReport & Document;
export const AccountantAiReportSchema = SchemaFactory.createForClass(AccountantAiReport);

AccountantAiReportSchema.index({ companyId: 1, createdAt: -1 });
