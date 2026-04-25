import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OcrModule } from './ocr/ocr.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AccountantAiReportsModule } from './accountant-ai-reports/accountant-ai-reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/bi_platform'),
    AuthModule,
    CompanyModule,
    CustomersModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    AnalyticsModule,
    OcrModule,
    ChatbotModule,
    AccountantAiReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
