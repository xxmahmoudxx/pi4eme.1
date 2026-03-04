import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { CategoryModule } from './module/Category.module';
import { ProductModule } from './module/Product.module';
import { StockModule } from './module/Stock.module';
import { SupplierModule } from './module/Supplier.module';
import { CommandeModule } from './module/Commande.module';
import { OrderItemModule } from './module/Orderitem.module ';  // ✅ espace supprimé
import { AchatModule } from './module/Achat.module';
import { PurchaseItemModule } from './module/Purchaseitem.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/bi_platform'),
    AuthModule,
    CompanyModule,
    CategoryModule,
    ProductModule,
    StockModule,
    SupplierModule,
    CommandeModule,
    OrderItemModule,
    AchatModule,
    PurchaseItemModule,
  ],
  controllers: [AppController],
})
export class AppModule {}