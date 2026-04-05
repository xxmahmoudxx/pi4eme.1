import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Sale, SaleSchema } from '../sales/schemas/sale.schema';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Stock, StockSchema } from '../auth/schemas/Stock.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: User.name, schema: UserSchema },
      { name: Stock.name, schema: StockSchema }
    ])
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService]
})
export class ChatbotModule {}
