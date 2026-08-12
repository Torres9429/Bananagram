import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CampaignMetricsService } from './campaign-metrics.service';
import { MetricsCronService } from '../cron/metrics-cron.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AssignDesignerDto } from './dto/assign-designer.dto';
import { RejectCampaignDto } from './dto/reject-campaign.dto';

type Claims = { sub: string; roles: string[] };

@ApiTags('campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly campaignMetrics: CampaignMetricsService,
    private readonly metricsCron: MetricsCronService,
  ) {}

  @Get()
  @RequirePermission('campanas', 'ver')
  findAll(@CurrentUser() user: Claims) {
    return this.campaigns.listCampaigns(user);
  }

  // Antes de ':id': si se declararan después, Nest intentaría matchear
  // "eligible-community-managers"/"eligible-designers" contra la ruta parametrizada.
  @Get('eligible-community-managers')
  @RequirePermission('campanas', 'ver')
  findEligibleCommunityManagers(@Query('categoryIds') categoryIds?: string) {
    return this.campaigns.listEligibleCommunityManagers(categoryIds?.split(',').filter(Boolean));
  }

  @Get('eligible-designers')
  @RequirePermission('campanas', 'ver')
  findEligibleDesigners() {
    return this.campaigns.listEligibleDesigners();
  }

  @Get(':id')
  @RequirePermission('campanas', 'ver')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.getCampaign(id);
  }

  // Sin BrandAccessGuard (mismo motivo que update/remove) — pertenencia
  // resuelta a mano vía CampaignsService.assertCanView, más permisiva que
  // assertCanManage (también deja ver a un Diseñador asignado).
  @Get(':id/metrics')
  @RequirePermission('metricas', 'ver')
  async getMetrics(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    await this.campaigns.getCampaign(id);
    await this.campaigns.assertCanView(id, user);
    return this.campaignMetrics.getCampaignMetrics(id);
  }

  // Atajo para no esperar el cron automático de cada 6h (MetricsCronService)
  // al probar/verificar una publicación real recién hecha — acota el
  // refresh a esta campaña e ignora la ventana de "ya sincronizado
  // recientemente" (a propósito: si el usuario pide "Actualizar" es porque
  // quiere el dato más nuevo ahora). Mismo permiso que GET, solo consulta/
  // refresca, no es una acción destructiva.
  @Post(':id/metrics/refresh')
  @RequirePermission('metricas', 'ver')
  async refreshMetrics(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    await this.campaigns.getCampaign(id);
    await this.campaigns.assertCanView(id, user);
    await this.metricsCron.generateMetrics({ campaignId: id, ignoreRecentWindow: true });
    return this.campaignMetrics.getCampaignMetrics(id);
  }

  @Post()
  @RequirePermission('campanas', 'crear')
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: Claims) {
    return this.campaigns.createCampaign(dto, user);
  }

  // Sin BrandAccessGuard: ese guard resuelve el :id de la ruta como un
  // brandId, y aquí :id es un campaignId — reusarlo negaría siempre el
  // acceso. La verificación de pertenencia (dueño de la marca, CM asignado
  // o Administrador) vive en CampaignsService.assertCanManage.
  @Patch(':id')
  @RequirePermission('campanas', 'editar')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto, @CurrentUser() user: Claims) {
    return this.campaigns.updateCampaign(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('campanas', 'editar')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.campaigns.removeCampaign(id, user);
  }

  @Post(':id/accept')
  @RequirePermission('campanas', 'aprobar')
  accept(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    return this.campaigns.acceptCampaign(id, user);
  }

  @Post(':id/reject')
  @RequirePermission('campanas', 'rechazar')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectCampaignDto, @CurrentUser() user: Claims) {
    return this.campaigns.rejectCampaign(id, dto.reason, user);
  }

  @Post(':id/designers')
  @RequirePermission('campanas', 'asignar')
  assignDesigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDesignerDto,
    @CurrentUser() user: Claims,
  ) {
    return this.campaigns.assignDesigner(id, dto.userId, user);
  }

  @Delete(':id/designers/:userId')
  @RequirePermission('campanas', 'asignar')
  unassignDesigner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: Claims,
  ) {
    return this.campaigns.unassignDesigner(id, userId, user);
  }
}
