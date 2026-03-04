import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseItem, PurchaseItemSchema } from '../auth/schemas/Purchaseitem.schema';
import { PurchaseItemService } from '../Service/Purchase item.service';
import { PurchaseItemController } from '../Controller/Purchase item.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseItem.name, schema: PurchaseItemSchema },
    ]),
  ],
  controllers: [PurchaseItemController],
  providers: [PurchaseItemService],
  exports: [MongooseModule],
})
export class PurchaseItemModule {}