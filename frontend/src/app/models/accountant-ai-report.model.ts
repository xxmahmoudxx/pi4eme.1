export type AccountantAiReportStatus =
  | 'DRAFT_GENERATED'
  | 'EDITED'
  | 'APPROVED'
  | 'SENT'
  | 'FAILED_TO_SEND';

export interface AccountantAiReportCitation {
  title: string;
  url: string;
  source: string;
  snippet: string;
}

export interface AccountantAiReportSections {
  executiveSummary?: string;
  businessState?: string;
  risks?: string[];
  opportunities?: string[];
  inventoryActions?: string[];
  purchasingActions?: string[];
  pricingActions?: string[];
  supplierActions?: string[];
  actionPlan?: string[];
  confidenceNote?: string;
  shortEmailSummary?: string;
  fullReportMarkdown?: string;
}

export interface AccountantAiReport {
  _id: string;
  companyId: string;
  createdByUserId: string;
  ownerEmail: string;
  status: AccountantAiReportStatus;
  aiDraft: string;
  editedDraft: string;
  finalApprovedText?: string;
  shortEmailSummary?: string;
  sections: AccountantAiReportSections;
  citations: AccountantAiReportCitation[];
  usedWebResearch: boolean;
  generatedAt: string;
  approvedAt?: string;
  sentAt?: string;
  emailStatus?: 'PENDING' | 'SENT' | 'FAILED';
  pdfPath?: string | null;
  generationErrors?: string[];
  sendErrors?: string[];
  createdAt?: string;
  updatedAt?: string;
}
