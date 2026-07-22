import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('catalogs/categories')
export class CategoriesController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  findAll() {
    return this.catalogs.listCategories();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getCategory(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.catalogs.createCategory(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogs.updateCategory(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeCategory(id);
  }
}