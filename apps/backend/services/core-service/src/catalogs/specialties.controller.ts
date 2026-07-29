import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CatalogsService } from './catalogs.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('catalogs/specialties')
export class SpecialtiesController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  @RequirePermission('catalogos', 'ver')
  findAll() {
    return this.catalogs.listSpecialties();
  }

  @Get(':id')
  @RequirePermission('catalogos', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getSpecialty(id);
  }

  @Post()
  @RequirePermission('catalogos', 'crear')
  create(@Body() dto: CreateSpecialtyDto) {
    return this.catalogs.createSpecialty(dto);
  }

  @Patch(':id')
  @RequirePermission('catalogos', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.catalogs.updateSpecialty(id, dto);
  }

  @Delete(':id')
  @RequirePermission('catalogos', 'eliminar')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeSpecialty(id);
  }
}
