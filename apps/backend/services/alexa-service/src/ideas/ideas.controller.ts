import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
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

  // deleteIdeaFromBackend del Lambda real (contrato de 6 funciones, ver
  // docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md) borra
  // por título, no por id — convive con DELETE /ideas/:id, no lo reemplaza.
  @Delete()
  @ApiQuery({ name: 'campaignId', required: true })
  @ApiQuery({ name: 'title', required: true })
  @RequirePermission('campanas', 'crear')
  removeByTitle(
    @Query('campaignId', ParseUUIDPipe) campaignId: string,
    @Query('title') title: string,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.removeIdeaByTitle(campaignId, title, authHeader);
  }
}
