import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseItem, PurchaseItemDocument } from '../auth/schemas/Purchaseitem.schema';
import { CreatePurchaseItemDto } from '../company/dto/create-purchase-item.dto';
import { UpdatePurchaseItemDto } from '../company/dto/update-purchase-item.dto';

@Injectable()
export class PurchaseItemService {
  constructor(
    @InjectModel(PurchaseItem.name)
    private readonly purchaseItemModel: Model<PurchaseItemDocument>,
  ) {}

  async create(dto: CreatePurchaseItemDto): Promise<PurchaseItem> {
    return this.purchaseItemModel.create(dto);
  }

  async findAll(companyId: string): Promise<PurchaseItem[]> {
    return this.purchaseItemModel
      .find({ companyId })
      .populate('achatId')
      .populate('supplierId')
      .populate('productId')
      .populate('companyId')
      .exec();
  }

  async findOne(id: string): Promise<PurchaseItem> {
    const item = await this.purchaseItemModel
      .findById(id)
      .populate('achatId')
      .populate('supplierId')
      .populate('productId')
      .populate('companyId')
      .exec();
    if (!item) throw new NotFoundException(`PurchaseItem #${id} not found`);
    return item;
  }

  async findByAchat(achatId: string): Promise<PurchaseItem[]> {
    return this.purchaseItemModel
      .find({ achatId })
      .populate('productId')
      .populate('supplierId')
      .exec();
  }

  async findBySupplier(supplierId: string): Promise<PurchaseItem[]> {
    return this.purchaseItemModel
      .find({ supplierId })
      .populate('achatId')
      .populate('productId')
      .exec();
  }

  async update(id: string, dto: UpdatePurchaseItemDto): Promise<PurchaseItem> {
    const updated = await this.purchaseItemModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`PurchaseItem #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.purchaseItemModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`PurchaseItem #${id} not found`);
  }
}