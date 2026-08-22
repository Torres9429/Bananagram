import { Controller, Get, Headers, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { CampaignsService } from './campaigns.service';

// BFF de solo lectura sobre core-service (Fase 6 del plan) — sin
// PermissionGuard propio: core-service ya aplica permiso + pertenencia real
// sobre el mismo Bearer reenviado, duplicarlo aquí no agrega nada.
//
// Montado en 'skill-campaigns', NO 'campaigns' (2026-08-21): el gateway ya
// tiene /api/campaigns reservado para core-service (el modelo crudo que usan
// brands-front/analytics-front) — con el mismo prefijo, este controller
// quedaba inalcanzable a través del gateway (todo tráfico a /api/campaigns
// se iba a core-service, nunca llegaba aquí). Verificado en vivo: el Lambda
// desplegado recibía el objeto crudo de core-service (sin totalPosts/score/
// topPost) en vez de este BFF compuesto, y ?name= no filtraba igual —
// "undefined" en el nombre/publicaciones de la campaña al seleccionarla por
// voz. Ver gateway/src/main.ts para el proxy correspondiente.
@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skill-campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @ApiQuery({ name: 'name', required: false, description: 'Resuelve por nombre en vez de listar todas' })
  findAll(@Query('name') name: string | undefined, @Headers('authorization') authHeader: string) {
    if (name) {
      return this.campaigns.fetchCampaignByName(authHeader, name);
    }
    return this.campaigns.fetchCampaigns(authHeader);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') authHeader: string) {
    return this.campaigns.fetchCampaign(authHeader, id);
  }

  @Get(':id/metrics')
  getMetrics(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') authHeader: string) {
    return this.campaigns.fetchCampaignMetrics(authHeader, id);
  }

  // GetIdeaRecommendationsIntent — sin PermissionGuard propio, mismo
  // criterio que el resto de este controller: ai-service ya exige
  // campanas:ver sobre el mismo Bearer reenviado.
  @Get(':id/recommendations')
  getRecommendations(@Param('id', ParseUUIDPipe) id: string, @Headers('authorization') authHeader: string) {
    return this.campaigns.fetchCampaignRecommendations(authHeader, id);
  }
}
