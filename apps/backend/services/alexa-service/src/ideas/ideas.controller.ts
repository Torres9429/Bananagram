import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';

type Claims = { sub: string; roles: string[] };

// Único dueño del dominio de ideas en todo el sistema (ver ideas.service.ts)
// — atiende tanto al Lambda de la skill (creación) como a la plataforma web
// (listar/borrar), ambos con el mismo JWT real de Bananagram. Ideas es un
// sub-recurso de Campaign pero con su PROPIO módulo de permisos (`ideas`,
// agregado 2026-08-19) — antes reusaba `campanas`, lo que dejaba a
// Diseñador sin poder generar/guardar ideas (solo tiene campanas:ver) pese
// a que sí es trabajo suyo; generar ideas no es lo mismo que crear/editar
// una campaña. La pertenencia real a la campaña se sigue verificando aparte
// (IdeasService.assertCampaignAccess), independiente del módulo de permisos.
@ApiTags('ideas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  // Cada usuario ve solo las ideas que ÉL guardó en la campaña, no las de
  // sus compañeros de equipo (CM/Diseñador/Cliente comparten acceso a la
  // misma campaña, pero sus ideas guardadas son personales) — filtrado por
  // createdBy en IdeasService. Administrador es la única excepción (ve/
  // gestiona todas, mismo criterio que CampaignsService.assertCanManage).
  @Get()
  @ApiQuery({ name: 'campaignId', required: true })
  @RequirePermission('ideas', 'ver')
  findByCampaign(
    @Query('campaignId', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: Claims,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.listByCampaign(campaignId, user.sub, user.roles.includes('administrador'), authHeader);
  }

  @Get(':id')
  @RequirePermission('ideas', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims, @Headers('authorization') authHeader: string) {
    return this.ideas.getIdea(id, user.sub, user.roles.includes('administrador'), authHeader);
  }

  @Post()
  @RequirePermission('ideas', 'crear')
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user: Claims, @Headers('authorization') authHeader: string) {
    return this.ideas.createIdea(dto, user, authHeader);
  }

  // GenerateContentIdeasIntent — genera ideas nuevas vía ai-service, no las
  // guarda (el Lambda decide cuál guardar después con POST /ideas). Mismo
  // permiso que crear una idea a mano — generar es, conceptualmente, la
  // misma capacidad de "aportar contenido nuevo a esta campaña".
  @Post('generate')
  @RequirePermission('ideas', 'crear')
  generate(@Body() dto: GenerateIdeasDto, @Headers('authorization') authHeader: string) {
    return this.ideas.generateIdeas(dto, authHeader);
  }

  @Patch(':id')
  @RequirePermission('ideas', 'crear')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIdeaDto,
    @CurrentUser() user: Claims,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.updateIdea(id, dto, user.sub, user.roles.includes('administrador'), authHeader);
  }

  @Delete(':id')
  @RequirePermission('ideas', 'crear')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims, @Headers('authorization') authHeader: string) {
    return this.ideas.removeIdea(id, user.sub, user.roles.includes('administrador'), authHeader);
  }

  // deleteIdeaFromBackend del Lambda real (contrato de 6 funciones, ver
  // docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md) borra
  // por título, no por id — convive con DELETE /ideas/:id, no lo reemplaza.
  @Delete()
  @ApiQuery({ name: 'campaignId', required: true })
  @ApiQuery({ name: 'title', required: true })
  @RequirePermission('ideas', 'crear')
  removeByTitle(
    @Query('campaignId', ParseUUIDPipe) campaignId: string,
    @Query('title') title: string,
    @CurrentUser() user: Claims,
    @Headers('authorization') authHeader: string,
  ) {
    return this.ideas.removeIdeaByTitle(campaignId, title, user.sub, user.roles.includes('administrador'), authHeader);
  }
}
