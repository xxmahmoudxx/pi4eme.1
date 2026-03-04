import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplier, SupplierSchema } from '../auth/schemas/supplier.schema';
import { SupplierService } from '../Service/Supplier.service';
import { SupplierController } from '../Controller/Supplier.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
    ]),
  ],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [MongooseModule],
})
export class SupplierModule {}