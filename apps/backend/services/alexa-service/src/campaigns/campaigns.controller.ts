import { Controller, Get, Headers, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { CampaignsService } from './campaigns.service';

// BFF de solo lectura sobre core-service (Fase 6 del plan) — sin
// PermissionGuard propio: core-service ya aplica permiso + pertenencia real
// sobre el mismo Bearer reenviado, duplicarlo aquí no agrega nada.
@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
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
