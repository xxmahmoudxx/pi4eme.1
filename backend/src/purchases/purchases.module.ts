import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { EtlModule } from '../etl/etl.module';
import { OcrModule } from '../ocr/ocr.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
        MulterModule.register({ storage: undefined }),
        EtlModule,
        OcrModule,
        SuppliersModule,
        AnalyticsModule,
    ],
    controllers: [PurchasesController],
    providers: [PurchasesService],
    exports: [PurchasesService],
})
export class PurchasesModule { }
