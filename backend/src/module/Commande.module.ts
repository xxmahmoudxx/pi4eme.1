import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Commande, CommandeSchema } from '../auth/schemas/Commande.schema';
import { OrderItem, OrderItemSchema } from '../auth/schemas/OrderItem.schema';
import { CommandeService } from '../Service/Commande.service';
import { CommandeController } from '../Controller/Commande.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Commande.name, schema: CommandeSchema },
      // ✅ OrderItem ajouté car CommandeService l'utilise
      { name: OrderItem.name, schema: OrderItemSchema },
    ]),
  ],
  controllers: [CommandeController],
  providers: [CommandeService],
  exports: [MongooseModule],
})
export class CommandeModule {}