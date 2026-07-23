import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CatalogsService } from './catalogs.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogs/specialties')
export class SpecialtiesController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  findAll() {
    return this.catalogs.listSpecialties();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getSpecialty(id);
  }

  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.catalogs.createSpecialty(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.catalogs.updateSpecialty(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeSpecialty(id);
  }
}
