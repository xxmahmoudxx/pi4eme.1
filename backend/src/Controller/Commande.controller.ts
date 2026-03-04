import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CommandeService } from '../Service/Commande.service';
import { CreateCommandeDto } from '../company/dto/create-commande.dto';
import { UpdateCommandeDto } from '../company/dto/update-commande.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('commandes')
export class CommandeController {
  constructor(private readonly commandeService: CommandeService) {}

  // POST /commandes
  @Post()
  create(@Body() dto: CreateCommandeDto) {
    return this.commandeService.create(dto);
  }

  // GET /commandes?companyId=xxx
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.commandeService.findAll(companyId);
  }

  // GET /commandes/:id  (inclut les OrderItems)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commandeService.findOne(id);
  }

  // GET /commandes/client/:clientId
  @Get('client/:clientId')
  findByClient(@Param('clientId') clientId: string) {
    return this.commandeService.findByClient(clientId);
  }

  // PATCH /commandes/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommandeDto) {
    return this.commandeService.update(id, dto);
  }

  // DELETE /commandes/:id  (supprime aussi les OrderItems)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commandeService.remove(id);
  }
}