import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { EtlModule } from '../etl/etl.module';
import { OcrModule } from '../ocr/ocr.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Sale.name, schema: SaleSchema }]),
        MulterModule.register({ storage: undefined }),
        EtlModule,
        OcrModule,
        CustomersModule,
    ],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
