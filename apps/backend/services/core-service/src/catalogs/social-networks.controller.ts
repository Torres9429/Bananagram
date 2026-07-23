import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CatalogsService } from './catalogs.service';
import { CreateSocialNetworkDto } from './dto/create-social-network.dto';
import { UpdateSocialNetworkDto } from './dto/update-social-network.dto';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalogs/social-networks')
export class SocialNetworksController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  findAll() {
    return this.catalogs.listSocialNetworks();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getSocialNetwork(id);
  }

  @Post()
  create(@Body() dto: CreateSocialNetworkDto) {
    return this.catalogs.createSocialNetwork(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSocialNetworkDto) {
    return this.catalogs.updateSocialNetwork(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.removeSocialNetwork(id);
  }
}
