import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Commande, CommandeDocument } from '../auth/schemas/Commande.schema';
import { OrderItem, OrderItemDocument } from '../auth/schemas/Orderitem.schema';
import { CreateCommandeDto } from '../company/dto/create-commande.dto';
import { UpdateCommandeDto } from '../company/dto/update-commande.dto';

@Injectable()
export class CommandeService {
  constructor(
    @InjectModel(Commande.name)
    private readonly commandeModel: Model<CommandeDocument>,

    @InjectModel(OrderItem.name)
    private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  async create(dto: CreateCommandeDto): Promise<Commande> {
    return this.commandeModel.create(dto);
  }

  async findAll(companyId: string): Promise<Commande[]> {
    return this.commandeModel
      .find({ companyId })
      .populate('clientId')
      .populate('companyId')
      .exec();
  }

  async findOne(id: string): Promise<any> {
    const commande = await this.commandeModel
      .findById(id)
      .populate('clientId')
      .populate('companyId')
      .exec();
    if (!commande) throw new NotFoundException(`Commande #${id} not found`);

    // Récupère les OrderItems liés
    const orderItems = await this.orderItemModel
      .find({ commandeId: id })
      .populate('productIds')
      .exec();

    return { ...commande.toObject(), orderItems };
  }

  async findByClient(clientId: string): Promise<Commande[]> {
    return this.commandeModel
      .find({ clientId })
      .populate('clientId')
      .exec();
  }

  async update(id: string, dto: UpdateCommandeDto): Promise<Commande> {
    const updated = await this.commandeModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Commande #${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.commandeModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Commande #${id} not found`);
    // Supprime les OrderItems liés
    await this.orderItemModel.deleteMany({ commandeId: id }).exec();
  }
}