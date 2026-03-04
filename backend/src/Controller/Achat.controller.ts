import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AchatService } from '../Service/Achat.service';
import { CreateAchatDto } from '../company/dto/create-achat.dto';
import { UpdateAchatDto } from '../company/dto/update-achat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('achats')
export class AchatController {
  constructor(private readonly achatService: AchatService) {}

  // POST /achats
  @Post()
  create(@Body() dto: CreateAchatDto) {
    return this.achatService.create(dto);
  }

  // GET /achats?companyId=xxx
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.achatService.findAll(companyId);
  }

  // GET /achats/:id  (inclut les PurchaseItems)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.achatService.findOne(id);
  }

  // PATCH /achats/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAchatDto) {
    return this.achatService.update(id, dto);
  }

  // DELETE /achats/:id  (supprime aussi les PurchaseItems)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.achatService.remove(id);
  }
}