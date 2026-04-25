import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');

interface PdfGenerationInput {
  reportId: string;
  companyName: string;
  ownerEmail: string;
  approvedByEmail: string;
  approvedAt: Date;
  generatedAt: Date;
  fullReportText: string;
  sections: {
    executiveSummary: string;
    risks: string[];
    opportunities: string[];
    actionPlan: string[];
    confidenceNote: string;
  };
  citations: Array<{ title: string; url: string; source: string }>;
}

@Injectable()
export class AccountantAiReportsPdfService {
  private readonly logger = new Logger(AccountantAiReportsPdfService.name);
  private readonly storageDir =
    process.env.ACCOUNTANT_REPORT_PDF_DIR || path.join(process.cwd(), 'storage', 'accountant-reports');

  async generatePdf(input: PdfGenerationInput): Promise<string> {
    fs.mkdirSync(this.storageDir, { recursive: true });

    const filename = `${input.reportId}-${Date.now()}.pdf`;
    const outputPath = path.join(this.storageDir, filename);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(20).text('AI Accountant Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444').text(`Company: ${input.companyName}`);
    doc.text(`Generated at: ${input.generatedAt.toISOString()}`);
    doc.text(`Approved at: ${input.approvedAt.toISOString()}`);
    doc.text(`Approved by: ${input.approvedByEmail}`);
    doc.text(`Recipient: ${input.ownerEmail}`);
    doc.fillColor('#000');
    doc.moveDown();

    this.section(doc, 'Executive Summary', input.sections.executiveSummary);
    this.listSection(doc, 'Major Risks', input.sections.risks);
    this.listSection(doc, 'Major Opportunities', input.sections.opportunities);
    this.listSection(doc, 'Action Plan', input.sections.actionPlan);
    this.section(doc, 'Confidence And Uncertainty', input.sections.confidenceNote);
    this.section(doc, 'Detailed Report', input.fullReportText);

    if (input.citations.length > 0) {
      this.listSection(
        doc,
        'Citations',
        input.citations.map((citation) => {
          const title = citation.title || 'External source';
          const source = citation.source ? ` (${citation.source})` : '';
          const url = citation.url ? ` - ${citation.url}` : '';
          return `${title}${source}${url}`;
        }),
      );
    }

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    this.logger.log(`Generated accountant report PDF: ${outputPath}`);
    return outputPath;
  }

  private section(doc: PDFKit.PDFDocument, title: string, content: string) {
    if (!content) return;
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).text(content, { align: 'left' });
  }

  private listSection(doc: PDFKit.PDFDocument, title: string, items: string[]) {
    if (!items || items.length === 0) return;
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11);
    for (const item of items) {
      doc.text(`- ${item}`, { align: 'left' });
    }
  }
}
