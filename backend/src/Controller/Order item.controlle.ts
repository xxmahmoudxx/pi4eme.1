import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { OrderItemService } from '../Service/Order item.service';
import { CreateOrderItemDto } from '../company/dto/create-order-item.dto';
import { UpdateOrderItemDto } from '../company/dto/update-order-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('order-items')
export class OrderItemController {
  constructor(private readonly orderItemService: OrderItemService) {}

  // POST /order-items
  @Post()
  create(@Body() dto: CreateOrderItemDto) {
    return this.orderItemService.create(dto);
  }

  // GET /order-items?companyId=xxx
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.orderItemService.findAll(companyId);
  }

  // GET /order-items/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderItemService.findOne(id);
  }

  // GET /order-items/commande/:commandeId
  @Get('commande/:commandeId')
  findByCommande(@Param('commandeId') commandeId: string) {
    return this.orderItemService.findByCommande(commandeId);
  }

  // PATCH /order-items/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderItemDto) {
    return this.orderItemService.update(id, dto);
  }

  // DELETE /order-items/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderItemService.remove(id);
  }
}