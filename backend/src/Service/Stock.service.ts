import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stock, StockDocument } from '../auth/schemas/stock.schema';
import { CreateStockDto } from '../company/dto/create-stock.dto';
import { UpdateStockDto } from '../company/dto/update-stock.dto';
@Injectable()
export class StockService {
  constructor(
    @InjectModel(Stock.name)
    private readonly stockModel: Model<StockDocument>,
  ) {}

  async create(dto: CreateStockDto): Promise<Stock> {
    return this.stockModel.create(dto);
  }

  async findAll(companyId: string): Promise<Stock[]> {
    return this.stockModel
      .find({ companyId })
      .populate('productId')
      .populate('companyId')
      .exec();
  }

  async findOne(id: string): Promise<Stock> {
    const stock = await this.stockModel
      .findById(id)
      .populate('productId')
      .populate('companyId')
      .exec();
    if (!stock) throw new NotFoundException(`Stock #${id} not found`);
    return stock;
  }

  async findByProduct(productId: string): Promise<Stock> {
    const stock = await this.stockModel
      .findOne({ productId })
      .populate('productId')
      .exec();
    if (!stock) throw new NotFoundException(`Stock for product #${productId} not found`);
    return stock;
  }

  async update(id: string, dto: UpdateStockDto): Promise<Stock> {
    const updated = await this.stockModel
      .findByIdAndUpdate(id, { ...dto, lastUpdate: new Date() }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Stock #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.stockModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Stock #${id} not found`);
  }
}