import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { CatalogsService } from './catalogs.service';
import { CreateSocialNetworkDto } from './dto/create-social-network.dto';
import { UpdateSocialNetworkDto } from './dto/update-social-network.dto';

// Regla de negocio #10: el catálogo de redes sociales lo gestiona solo el
// Administrador — solo ese rol tiene `catalogos:crear/editar/eliminar` en el
// seed (ver packages/seed/src/index.js), así que basta el mismo permiso que
// el resto de catálogos para cumplir la regla.
@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('catalogs/social-networks')
export class SocialNetworksController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  @RequirePermission('catalogos', 'ver')
  findAll() {
    return this.catalogs.listSocialNetworks();
  }

  @Get(':id')
  @RequirePermission('catalogos', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getSocialNetwork(id);
  }

  @Post()
  @RequirePermission('catalogos', 'crear')
  create(@Body() dto: CreateSocialNetworkDto) {
    return this.catalogs.createSocialNetwork(dto);
  }

  @Patch(':id')
  @RequirePermission('catalogos', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSocialNetworkDto) {
    return this.catalogs.updateSocialNetwork(id, dto);
  }

  @Delete(':id')
  @RequirePermission('catalogos', 'eliminar')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeSocialNetwork(id);
  }
}
