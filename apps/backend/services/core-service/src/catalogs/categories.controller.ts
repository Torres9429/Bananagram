import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CatalogsService } from './catalogs.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('catalogs/categories')
export class CategoriesController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  @RequirePermission('catalogos', 'ver')
  findAll() {
    return this.catalogs.listCategories();
  }

  @Get(':id')
  @RequirePermission('catalogos', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getCategory(id);
  }

  @Post()
  @RequirePermission('catalogos', 'crear')
  create(@Body() dto: CreateCategoryDto) {
    return this.catalogs.createCategory(dto);
  }

  @Patch(':id')
  @RequirePermission('catalogos', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogs.updateCategory(id, dto);
  }

  @Delete(':id')
  @RequirePermission('catalogos', 'eliminar')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeCategory(id);
  }
}
