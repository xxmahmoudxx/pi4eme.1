import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Achat, AchatDocument } from '../auth/schemas/Achat.schema ';
import { PurchaseItem, PurchaseItemDocument } from '../auth/schemas/Purchaseitem.schema';
import { CreateAchatDto } from '../company/dto/create-achat.dto';
import { UpdateAchatDto } from '../company/dto/update-achat.dto';
import { PurchaseItemService } from '../Service/Purchase item.service';

@Injectable()
export class AchatService {
  constructor(
    @InjectModel(Achat.name)
    private readonly achatModel: Model<AchatDocument>,

    @InjectModel(PurchaseItem.name)
    private readonly purchaseItemModel: Model<PurchaseItemDocument>,
  ) {}

  async create(dto: CreateAchatDto): Promise<Achat> {
    return this.achatModel.create(dto);
  }

  async findAll(companyId: string): Promise<Achat[]> {
    return this.achatModel
      .find({ companyId })
      .populate('companyId')
      .populate('productIds')   // Many-to-Many
      .exec();
  }

  async findOne(id: string): Promise<any> {
    const achat = await this.achatModel
      .findById(id)
      .populate('companyId')
      .populate('productIds')
      .exec();
    if (!achat) throw new NotFoundException(`Achat #${id} not found`);

    // Récupère les PurchaseItems liés
    const purchaseItems = await this.purchaseItemModel
      .find({ achatId: id })
      .populate('productId')
      .populate('supplierId')
      .exec();

    return { ...achat.toObject(), purchaseItems };
  }

  async update(id: string, dto: UpdateAchatDto): Promise<Achat> {
    const updated = await this.achatModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Achat #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.achatModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Achat #${id} not found`);
    // Supprime les PurchaseItems liés
    await this.purchaseItemModel.deleteMany({ achatId: id }).exec();
  }
}