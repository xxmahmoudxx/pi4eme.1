import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Stock, StockSchema } from '../auth/schemas/stock.schema';
import { StockService } from '../Service/stock.service';
import { StockController } from '../Controller/Stock.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Stock.name, schema: StockSchema },
    ]),
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [MongooseModule],
})
export class StockModule {}