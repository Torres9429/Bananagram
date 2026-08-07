import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { BrandAccessGuard } from '../guards/brand-access.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @RequirePermission('marcas', 'ver')
  findAll(@CurrentUser() user: { sub: string; roles: string[] }) {
    return this.brands.listBrands(user);
  }

  @Get(':id')
  @RequirePermission('marcas', 'ver')
  @UseGuards(BrandAccessGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.getBrand(id);
  }

  @Post()
  @RequirePermission('marcas', 'crear')
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: { sub: string; roles: string[] }) {
    return this.brands.createBrand(dto, user);
  }

  @Patch(':id')
  @RequirePermission('marcas', 'editar')
  @UseGuards(BrandAccessGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.updateBrand(id, dto);
  }

  @Delete(':id')
  @RequirePermission('marcas', 'eliminar')
  @UseGuards(BrandAccessGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.removeBrand(id);
  }
}
