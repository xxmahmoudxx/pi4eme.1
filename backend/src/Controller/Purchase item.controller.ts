import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PurchaseItemService } from '../Service/Purchase item.service';
import { CreatePurchaseItemDto } from '../company/dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from '../company/dto/update-purchase-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('purchase-items')
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  // POST /purchase-items
  @Post()
  create(@Body() dto: CreatePurchaseItemDto) {
    return this.purchaseItemService.create(dto);
  }

  // GET /purchase-items?companyId=xxx
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.purchaseItemService.findAll(companyId);
  }

  // GET /purchase-items/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseItemService.findOne(id);
  }

  // GET /purchase-items/achat/:achatId
  @Get('achat/:achatId')
  findByAchat(@Param('achatId') achatId: string) {
    return this.purchaseItemService.findByAchat(achatId);
  }

  // GET /purchase-items/supplier/:supplierId
  @Get('supplier/:supplierId')
  findBySupplier(@Param('supplierId') supplierId: string) {
    return this.purchaseItemService.findBySupplier(supplierId);
  }

  // PATCH /purchase-items/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseItemDto) {
    return this.purchaseItemService.update(id, dto);
  }

  // DELETE /purchase-items/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseItemService.remove(id);
  }
}