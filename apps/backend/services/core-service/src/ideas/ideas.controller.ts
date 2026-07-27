import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';

type Claims = { sub: string; role: string };

// Ideas de contenido son un sub-recurso de Campaign (no tienen módulo propio
// en el catálogo de permisos, ver packages/seed/src/index.js): se autorizan
// con el mismo permiso `campanas` y, además, con pertenencia real a la
// campaña (IdeasService.assertCampaignAccess).
@ApiTags('ideas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  @Get()
  @ApiQuery({ name: 'campaignId', required: true })
  @RequirePermission('campanas', 'ver')
  findByCampaign(@Query('campaignId', ParseUUIDPipe) campaignId: string, @CurrentUser() user: Claims) {
    return this.ideas.listByCampaign(campaignId, user);
  }

  @Get(':id')
  @RequirePermission('campanas', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.ideas.getIdea(id, user);
  }

  @Post()
  @RequirePermission('campanas', 'crear')
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user: Claims) {
    return this.ideas.createIdea(dto, user);
  }

  @Patch(':id')
  @RequirePermission('campanas', 'crear')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIdeaDto, @CurrentUser() user: Claims) {
    return this.ideas.updateIdea(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('campanas', 'crear')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.ideas.removeIdea(id, user);
  }
}
