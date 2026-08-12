import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';

type Claims = { sub: string; roles: string[] };

// Único dueño del dominio de ideas en todo el sistema (ver ideas.service.ts)
// — atiende tanto al Lambda de la skill (creación) como a la plataforma web
// (listar/borrar), ambos con el mismo JWT real de Bananagram. Ideas son un
// sub-recurso de Campaign, sin módulo propio en el catálogo de permisos
// (mismo criterio que tenía antes en core-service) — se autorizan con
// `campanas` + pertenencia real a la campaña (IdeasService.assertCampaignAccess).
@ApiTags('ideas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  @Get()
  @ApiQuery({ name: 'campaignId', required: true })
  @RequirePermission('campanas', 'ver')
  findByCampaign(
    @Query('campaignId', ParseUUIDPipe) campaignId: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.listByCampaign(campaignId, authHeader);
  }

  @Get(':id')
  @RequirePermission('campanas', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') authHeader: string) {
    return this.ideas.getIdea(id, authHeader);
  }

  @Post()
  @RequirePermission('campanas', 'crear')
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user: Claims, @Headers('authorization') authHeader: string) {
    return this.ideas.createIdea(dto, user, authHeader);
  }

  @Patch(':id')
  @RequirePermission('campanas', 'crear')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIdeaDto,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.updateIdea(id, dto, authHeader);
  }

  @Delete(':id')
  @RequirePermission('campanas', 'crear')
  remove(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') authHeader: string) {
    return this.ideas.removeIdea(id, authHeader);
  }
}
