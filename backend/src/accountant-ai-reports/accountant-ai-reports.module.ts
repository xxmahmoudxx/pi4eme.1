import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../analytics/analytics.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { CompanyConfig, CompanyConfigSchema } from '../company/schemas/company-config.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { MailModule } from '../mail/mail.module';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { Supplier, SupplierSchema } from '../suppliers/schemas/supplier.schema';
import { AccountantAiReportsAgentService } from './accountant-ai-reports-agent.service';
import { AccountantAiReportsController } from './accountant-ai-reports.controller';
import { AccountantAiReportsPdfService } from './accountant-ai-reports-pdf.service';
import { AccountantAiReportsService } from './accountant-ai-reports.service';
import {
  AccountantAiReport,
  AccountantAiReportSchema,
} from './schemas/accountant-ai-report.schema';

@Module({
  imports: [
    MailModule,
    AnalyticsModule,
    MongooseModule.forFeature([
      { name: AccountantAiReport.name, schema: AccountantAiReportSchema },
      { name: Sale.name, schema: SaleSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: User.name, schema: UserSchema },
      { name: CompanyConfig.name, schema: CompanyConfigSchema },
    ]),
  ],
  controllers: [AccountantAiReportsController],
  providers: [
    AccountantAiReportsService,
    AccountantAiReportsAgentService,
    AccountantAiReportsPdfService,
  ],
})
export class AccountantAiReportsModule {}
