import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderItem, OrderItemDocument } from '../auth/schemas/Orderitem.schema';
import { CreateOrderItemDto } from '../company/dto/create-order-item.dto';
import { UpdateOrderItemDto } from '../company/dto/update-order-item.dto';

@Injectable()
export class OrderItemService {
  constructor(
    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  async create(dto: CreateOrderItemDto): Promise<OrderItem> {
    return this.orderItemModel.create(dto);
  }

  async findAll(companyId: string): Promise<OrderItem[]> {
    return this.orderItemModel
      .find({ companyId })
      .populate('commandeId')
      .populate('productIds')   // Many-to-Many
      .populate('companyId')
      .exec();
  }

  async findOne(id: string): Promise<OrderItem> {
    const item = await this.orderItemModel
      .findById(id)
      .populate('commandeId')
      .populate('productIds')
      .populate('companyId')
      .exec();
    if (!item) throw new NotFoundException(`OrderItem #${id} not found`);
    return item;
  }

  async findByCommande(commandeId: string): Promise<OrderItem[]> {
    return this.orderItemModel
      .find({ commandeId })
      .populate('productIds')
      .exec();
  }

  async update(id: string, dto: UpdateOrderItemDto): Promise<OrderItem> {
    const updated = await this.orderItemModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`OrderItem #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.orderItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`OrderItem #${id} not found`);
  }
}