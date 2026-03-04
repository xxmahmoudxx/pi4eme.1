import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from '../Service/Category.service';
import { CreateCategoryDto } from '../company/dto/create-category.dto';
import { UpdateCategoryDto } from '../company/dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // POST /categories
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // GET /categories?companyId=xxx
  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.categoryService.findAll(companyId);
  }

  // GET /categories/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  // PATCH /categories/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  // DELETE /categories/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}