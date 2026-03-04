import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderItem, OrderItemSchema } from '../auth/schemas/Orderitem.schema';
import { OrderItemService } from '../Service/Order item.service';
import { OrderItemController } from '../Controller/Order item.controlle';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderItem.name, schema: OrderItemSchema },
    ]),
  ],
  controllers: [OrderItemController],
  providers: [OrderItemService],
  exports: [MongooseModule],
})
export class OrderItemModule {}