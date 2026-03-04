import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Achat, AchatSchema } from '../auth/schemas/Achat.schema ';
import { PurchaseItem, PurchaseItemSchema } from '../auth/schemas/PurchaseItem.schema';
import { AchatService } from '../Service/Achat.service';
import { AchatController } from '../Controller/Achat.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achat.name, schema: AchatSchema },
      { name: PurchaseItem.name, schema: PurchaseItemSchema }, // ✅ ajouté
    ]),
  ],
  controllers: [AchatController],
  providers: [AchatService],
  exports: [MongooseModule],
})
export class AchatModule {}