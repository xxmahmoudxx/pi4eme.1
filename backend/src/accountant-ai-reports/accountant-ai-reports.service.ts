import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { UserRole } from '../auth/roles.enum';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { CompanyConfig, CompanyConfigDocument } from '../company/schemas/company-config.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { MailService } from '../mail/mail.service';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { ApproveAndSendAccountantAiReportDto } from './dto/approve-and-send-accountant-ai-report.dto';
import { GenerateAccountantAiReportDto } from './dto/generate-accountant-ai-report.dto';
import { UpdateAccountantAiReportDto } from './dto/update-accountant-ai-report.dto';
import {
  AccountantAiReport,
  AccountantAiReportDocument,
  AccountantAiReportStatus,
} from './schemas/accountant-ai-report.schema';
import {
  AccountantAiReportsAgentService,
  NormalizedAgentReport,
} from './accountant-ai-reports-agent.service';
import { AccountantAiReportsPdfService } from './accountant-ai-reports-pdf.service';

interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
}

@Injectable()
export class AccountantAiReportsService {
  private readonly logger = new Logger(AccountantAiReportsService.name);

  constructor(
    @InjectModel(AccountantAiReport.name)
    private readonly reportModel: Model<AccountantAiReportDocument>,
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(CompanyConfig.name)
    private readonly companyConfigModel: Model<CompanyConfigDocument>,
    private readonly analyticsService: AnalyticsService,
    private readonly mailService: MailService,
    private readonly agentService: AccountantAiReportsAgentService,
    private readonly pdfService: AccountantAiReportsPdfService,
  ) {}

  async generateDraft(user: AuthenticatedUser, dto: GenerateAccountantAiReportDto) {
    this.assertAccountant(user);

    const ownerInfo = await this.resolveOwnerInfo(user.companyId);
    const context = await this.buildCompanyContext(user.companyId);
    const aiReport = await this.agentService.generateReport({
      companyId: user.companyId,
      includeWebResearch: Boolean(dto.includeWebResearch),
      focusAreas: dto.focusAreas || [],
      customInstructions: dto.customInstructions || '',
      context,
    });

    const report = await this.reportModel.create({
      companyId: user.companyId,
      createdByUserId: user.userId,
      ownerUserId: ownerInfo.ownerUserId,
      ownerEmail: ownerInfo.ownerEmail,
      status: 'DRAFT_GENERATED',
      aiDraft: aiReport.sections.fullReportMarkdown,
      editedDraft: aiReport.sections.fullReportMarkdown,
      shortEmailSummary: aiReport.sections.shortEmailSummary,
      sections: aiReport.sections,
      citations: aiReport.citations,
      usedWebResearch: aiReport.usedWebResearch,
      generatedAt: new Date(),
      emailStatus: 'PENDING',
      generationErrors: [],
      sendErrors: [],
      statusHistory: [
        {
          status: 'DRAFT_GENERATED',
          changedByUserId: user.userId,
          changedAt: new Date(),
          note: 'Initial AI draft generated',
        },
      ],
      auditTrail: [
        {
          action: 'REPORT_GENERATED',
          byUserId: user.userId,
          at: new Date(),
          meta: {
            includeWebResearch: Boolean(dto.includeWebResearch),
            warnings: aiReport.generationWarnings,
          },
        },
      ],
    });

    return report.toObject();
  }

  async regenerateDraft(
    user: AuthenticatedUser,
    reportId: string,
    dto: GenerateAccountantAiReportDto,
  ) {
    this.assertAccountant(user);
    const report = await this.getCompanyReportById(user.companyId, reportId);
    const context = await this.buildCompanyContext(user.companyId);

    let aiReport: NormalizedAgentReport;
    try {
      aiReport = await this.agentService.generateReport({
        companyId: user.companyId,
        reportId: report.id,
        includeWebResearch: Boolean(dto.includeWebResearch),
        focusAreas: dto.focusAreas || [],
        customInstructions: dto.customInstructions || '',
        previousDraft: report.editedDraft || report.aiDraft,
        context,
      });
    } catch (error: any) {
      report.generationErrors = [
        ...(report.generationErrors || []),
        `${new Date().toISOString()} - ${error?.message || 'Unknown regeneration error'}`,
      ];
      report.auditTrail.push({
        action: 'REPORT_REGENERATION_FAILED',
        byUserId: user.userId,
        at: new Date(),
        meta: {},
      } as any);
      await report.save();
      throw error;
    }

    report.status = 'DRAFT_GENERATED';
    report.aiDraft = aiReport.sections.fullReportMarkdown;
    report.editedDraft = aiReport.sections.fullReportMarkdown;
    report.shortEmailSummary = aiReport.sections.shortEmailSummary;
    report.sections = aiReport.sections;
    report.citations = aiReport.citations as any;
    report.usedWebResearch = aiReport.usedWebResearch;
    report.generatedAt = new Date();
    report.generationErrors = [];
    report.statusHistory.push({
      status: 'DRAFT_GENERATED',
      changedByUserId: user.userId,
      changedAt: new Date(),
      note: 'Draft regenerated',
    } as any);
    report.auditTrail.push({
      action: 'REPORT_REGENERATED',
      byUserId: user.userId,
      at: new Date(),
      meta: {
        includeWebResearch: Boolean(dto.includeWebResearch),
        warnings: aiReport.generationWarnings,
      },
    } as any);

    await report.save();
    return report.toObject();
  }

  async saveEditedDraft(
    user: AuthenticatedUser,
    reportId: string,
    dto: UpdateAccountantAiReportDto,
  ) {
    this.assertAccountant(user);
    if (!dto.editedDraft || dto.editedDraft.trim().length < 10) {
      throw new BadRequestException('Edited draft is too short');
    }

    const report = await this.getCompanyReportById(user.companyId, reportId);
    report.editedDraft = dto.editedDraft;
    if (dto.shortEmailSummary !== undefined) {
      report.shortEmailSummary = dto.shortEmailSummary;
    }
    report.status = 'EDITED';
    report.statusHistory.push({
      status: 'EDITED',
      changedByUserId: user.userId,
      changedAt: new Date(),
      note: 'Draft edited by accountant',
    } as any);
    report.auditTrail.push({
      action: 'REPORT_EDITED',
      byUserId: user.userId,
      at: new Date(),
      meta: {
        editedLength: dto.editedDraft.length,
      },
    } as any);

    await report.save();
    return report.toObject();
  }

  async approveAndSend(
    user: AuthenticatedUser,
    reportId: string,
    dto: ApproveAndSendAccountantAiReportDto,
  ) {
    this.assertAccountant(user);
    const report = await this.getCompanyReportById(user.companyId, reportId);
    if (report.status === 'SENT') {
      throw new BadRequestException('Report is already sent');
    }

    if (dto.emailOverride && dto.emailOverride.toLowerCase() !== report.ownerEmail.toLowerCase()) {
      throw new ForbiddenException('Email override must match the company owner email');
    }

    const finalText = (dto.finalApprovedText || report.editedDraft || report.aiDraft || '').trim();
    if (!finalText) {
      throw new BadRequestException('No report content available for approval');
    }

    const shortSummary = (dto.shortEmailSummary || report.shortEmailSummary || '').trim();
    const approvedAt = new Date();

    report.finalApprovedText = finalText;
    report.shortEmailSummary = shortSummary || finalText.slice(0, 400);
    report.status = 'APPROVED';
    report.approvedBy = user.userId;
    report.approvedAt = approvedAt;
    report.statusHistory.push({
      status: 'APPROVED',
      changedByUserId: user.userId,
      changedAt: approvedAt,
      note: 'Approved by accountant',
    } as any);
    report.auditTrail.push({
      action: 'REPORT_APPROVED',
      byUserId: user.userId,
      at: approvedAt,
      meta: {},
    } as any);
    await report.save();

    let pdfPath = '';
    try {
      const companyName =
        (report.sections as any)?.companyName ||
        (await this.companyConfigModel.findOne({ companyId: user.companyId }).lean())?.companyName ||
        'Company';

      pdfPath = await this.pdfService.generatePdf({
        reportId: report.id,
        companyName,
        ownerEmail: report.ownerEmail,
        approvedByEmail: user.email,
        approvedAt,
        generatedAt: report.generatedAt || approvedAt,
        fullReportText: finalText,
        sections: {
          executiveSummary: (report.sections as any)?.executiveSummary || '',
          risks: Array.isArray((report.sections as any)?.risks) ? (report.sections as any).risks : [],
          opportunities: Array.isArray((report.sections as any)?.opportunities)
            ? (report.sections as any).opportunities
            : [],
          actionPlan: Array.isArray((report.sections as any)?.actionPlan)
            ? (report.sections as any).actionPlan
            : [],
          confidenceNote: (report.sections as any)?.confidenceNote || '',
        },
        citations: Array.isArray(report.citations) ? (report.citations as any) : [],
      });

      await this.mailService.sendAccountantReportEmail({
        to: report.ownerEmail,
        companyName,
        summary: report.shortEmailSummary,
        approvedBy: user.email,
        approvedAt,
        attachmentPath: pdfPath,
      });
    } catch (error: any) {
      const message = `${new Date().toISOString()} - ${error?.message || 'Failed to send report email'}`;
      report.status = 'FAILED_TO_SEND';
      report.emailStatus = 'FAILED';
      report.pdfPath = pdfPath || null;
      report.sendErrors = [...(report.sendErrors || []), message];
      report.statusHistory.push({
        status: 'FAILED_TO_SEND',
        changedByUserId: user.userId,
        changedAt: new Date(),
        note: 'Email sending failed',
      } as any);
      report.auditTrail.push({
        action: 'REPORT_SEND_FAILED',
        byUserId: user.userId,
        at: new Date(),
        meta: { error: error?.message || 'unknown' },
      } as any);
      await report.save();
      throw new InternalServerErrorException('Report approved but email sending failed');
    }

    report.status = 'SENT';
    report.emailStatus = 'SENT';
    report.sentAt = new Date();
    report.pdfPath = pdfPath;
    report.statusHistory.push({
      status: 'SENT',
      changedByUserId: user.userId,
      changedAt: report.sentAt,
      note: `Sent to ${report.ownerEmail}`,
    } as any);
    report.auditTrail.push({
      action: 'REPORT_SENT',
      byUserId: user.userId,
      at: report.sentAt,
      meta: {
        ownerEmail: report.ownerEmail,
        pdfPath,
      },
    } as any);
    await report.save();

    return report.toObject();
  }

  async getHistory(user: AuthenticatedUser, limit = 30) {
    const safeLimit = Math.min(Math.max(limit || 30, 1), 100);
    const query: any = { companyId: user.companyId };
    if (user.role === UserRole.CompanyOwner) {
      query.status = { $in: ['APPROVED', 'SENT', 'FAILED_TO_SEND'] };
    }

    return this.reportModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()
      .exec();
  }

  async getById(user: AuthenticatedUser, reportId: string) {
    const report = await this.getCompanyReportById(user.companyId, reportId);
    if (
      user.role === UserRole.CompanyOwner &&
      !['APPROVED', 'SENT', 'FAILED_TO_SEND'].includes(report.status)
    ) {
      throw new ForbiddenException('Owners can only view approved or sent reports');
    }
    return report.toObject();
  }

  private async getCompanyReportById(companyId: string, reportId: string) {
    const report = await this.reportModel.findOne({ _id: reportId, companyId }).exec();
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  private async resolveOwnerInfo(companyId: string) {
    const companyRef = this.toCompanyRef(companyId);
    const [ownerUser, companyConfig] = await Promise.all([
      this.userModel
        .findOne({ companyId: companyRef, role: UserRole.CompanyOwner, status: 'active' })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
      this.companyConfigModel.findOne({ companyId }).lean().exec(),
    ]);

    const ownerEmail = ownerUser?.email || companyConfig?.email || '';
    if (!ownerEmail) {
      throw new BadRequestException(
        'No CompanyOwner email found for this company. Configure owner account or company email first.',
      );
    }

    return {
      ownerUserId: ownerUser?._id?.toString() || null,
      ownerEmail,
      companyName: companyConfig?.companyName || 'Company',
    };
  }

  private async buildCompanyContext(companyId: string) {
    const companyRef = this.toCompanyRef(companyId);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      companyConfig,
      healthScore,
      salesForecast,
      stockoutRisks,
      productPerformance,
      salesTotals,
      purchaseTotals,
      salesTrend,
      purchaseTrend,
      topCustomers,
      topSuppliers,
      topProducts,
      customerCount,
      supplierCount,
      purchaseApprovalStats,
      recentSales,
      recentPurchases,
    ] = await Promise.all([
      this.companyConfigModel.findOne({ companyId }).lean().exec(),
      this.analyticsService.getHealthScore(companyId),
      this.analyticsService.getSalesForecast(companyId),
      this.analyticsService.getStockoutRisks(companyId),
      this.analyticsService.getProductPerformance(companyId),
      this.saleModel
        .aggregate([
          { $match: { companyId: companyRef } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              totalQuantity: { $sum: '$quantity' },
              salesCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
      this.purchaseModel
        .aggregate([
          { $match: { companyId: companyRef } },
          {
            $group: {
              _id: null,
              totalCost: { $sum: '$totalCost' },
              totalQuantity: { $sum: '$quantity' },
              purchaseCount: { $sum: 1 },
            },
          },
        ])
        .exec(),
      this.saleModel
        .aggregate([
          { $match: { companyId: companyRef, date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              revenue: { $sum: '$totalAmount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.purchaseModel
        .aggregate([
          { $match: { companyId: companyRef, date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              totalCost: { $sum: '$totalCost' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.saleModel
        .aggregate([
          { $match: { companyId: companyRef } },
          { $group: { _id: '$customer', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ])
        .exec(),
      this.purchaseModel
        .aggregate([
          { $match: { companyId: companyRef } },
          { $group: { _id: '$supplier', spend: { $sum: '$totalCost' }, count: { $sum: 1 } } },
          { $sort: { spend: -1 } },
          { $limit: 5 },
        ])
        .exec(),
      this.saleModel
        .aggregate([
          { $match: { companyId: companyRef } },
          { $group: { _id: '$product', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 8 },
        ])
        .exec(),
      this.customerModel.countDocuments({ companyId: companyRef }).exec(),
      this.supplierModel.countDocuments({ companyId: companyRef }).exec(),
      this.purchaseModel
        .aggregate([
          { $match: { companyId: companyRef, finalStatus: { $in: ['APPROVED', 'REJECTED'] } } },
          {
            $group: {
              _id: '$finalStatus',
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
      this.saleModel
        .find({ companyId: companyRef })
        .sort({ date: -1 })
        .limit(20)
        .select('date customer product category quantity unitPrice totalAmount status')
        .lean()
        .exec(),
      this.purchaseModel
        .find({ companyId: companyRef })
        .sort({ date: -1 })
        .limit(20)
        .select(
          'date supplier item category quantity unitCost totalCost status finalStatus aiDecision aiConfidence reviewedAt',
        )
        .lean()
        .exec(),
    ]);

    const salesSummary = salesTotals[0] || { totalRevenue: 0, totalQuantity: 0, salesCount: 0 };
    const purchasesSummary = purchaseTotals[0] || {
      totalCost: 0,
      totalQuantity: 0,
      purchaseCount: 0,
    };

    const reviewStats = purchaseApprovalStats.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      { APPROVED: 0, REJECTED: 0 },
    );

    const profitEstimate = Number(salesSummary.totalRevenue || 0) - Number(purchasesSummary.totalCost || 0);
    const reorderRecommendations = Array.isArray(stockoutRisks)
      ? stockoutRisks
          .filter((risk: any) => ['HIGH', 'MEDIUM', 'High', 'Medium'].includes(risk.risk))
          .slice(0, 10)
      : [];

    return {
      generatedAt: new Date().toISOString(),
      company: {
        companyId,
        companyName: companyConfig?.companyName || 'Company',
        currency: companyConfig?.currency || 'USD',
        taxRate: companyConfig?.taxRate ?? 0,
        notificationEmail: companyConfig?.email || '',
      },
      internalFacts: {
        kpis: {
          totalRevenue: Number(salesSummary.totalRevenue || 0),
          totalCost: Number(purchasesSummary.totalCost || 0),
          estimatedProfit: profitEstimate,
          salesCount: Number(salesSummary.salesCount || 0),
          purchaseCount: Number(purchasesSummary.purchaseCount || 0),
          customerCount,
          supplierCount,
        },
        analytics: {
          healthScore,
          salesForecast,
          stockoutRisks,
          reorderRecommendations,
          productPerformance,
        },
        trends: {
          salesMonthly: salesTrend,
          purchasesMonthly: purchaseTrend,
        },
        topEntities: {
          customers: topCustomers,
          suppliers: topSuppliers,
          products: topProducts,
        },
        purchaseApprovalHistory: {
          approved: reviewStats.APPROVED || 0,
          rejected: reviewStats.REJECTED || 0,
        },
        samples: {
          recentSales,
          recentPurchases,
        },
      },
      rules: {
        noCrossCompanyAccess: true,
        emphasizeInternalDataFirst: true,
        avoidUnsupportedClaims: true,
      },
    };
  }

  private toCompanyRef(companyId: string): string | Types.ObjectId {
    return Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : companyId;
  }

  private assertAccountant(user: AuthenticatedUser) {
    if (user.role !== UserRole.Accountant) {
      throw new ForbiddenException('Only Accountant users can perform this action');
    }
    if (!user.companyId) {
      throw new ForbiddenException('Missing company scope');
    }
  }
}
