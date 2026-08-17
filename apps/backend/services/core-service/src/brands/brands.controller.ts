import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { BrandAccessGuard } from '../guards/brand-access.guard';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
import { BrandsService } from './brands.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { AccountMetricsCronService } from '../cron/account-metrics-cron.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateConnectUrlDto } from './dto/create-connect-url.dto';

@ApiTags('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brands: BrandsService,
    private readonly socialAccounts: SocialAccountsService,
    private readonly accountMetricsCron: AccountMetricsCronService,
  ) {}

  @Get()
  @RequirePermission('marcas', 'ver')
  findAll(@CurrentUser() user: { sub: string; roles: string[] }) {
    return this.brands.listBrands(user);
  }

  @Get(':id')
  @RequirePermission('marcas', 'ver')
  @UseGuards(BrandAccessGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.getBrand(id);
  }

  @Post()
  @RequirePermission('marcas', 'crear')
  create(@Body() dto: CreateBrandDto, @CurrentUser() user: { sub: string; roles: string[] }) {
    return this.brands.createBrand(dto, user);
  }

  @Patch(':id')
  @RequirePermission('marcas', 'editar')
  @UseGuards(BrandAccessGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.updateBrand(id, dto);
  }

  @Delete(':id')
  @RequirePermission('marcas', 'eliminar')
  @UseGuards(BrandAccessGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brands.removeBrand(id);
  }

  @Post(':id/connect-url')
  @RequirePermission('marcas', 'editar')
  @UseGuards(BrandAccessGuard)
  createConnectUrl(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateConnectUrlDto) {
    return this.brands.createConnectUrl(id, dto.allowedSocial);
  }

  // Para cuando el perfil de Ayrshare se borró desde su dashboard (fuera de
  // nuestro control) y el profileKey guardado quedó huérfano — genera un
  // perfil nuevo y un connectUrl nuevo, sin recrear la marca.
  @Post(':id/reprovision-ayrshare')
  @RequirePermission('marcas', 'editar')
  @UseGuards(BrandAccessGuard)
  reprovisionAyrshare(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateConnectUrlDto) {
    return this.brands.reprovisionAyrshareProfile(id, dto.allowedSocial);
  }

  // Sin BrandAccessGuard a propósito — mismo motivo que ScoreController:
  // criterio más estricto (solo dueño de marca o Administrador), resuelto a
  // mano vía SocialAccountsService.assertIsBrandOwnerOrAdmin.
  @Get(':id/metrics-history')
  @RequirePermission('marcas', 'ver')
  async getMetricsHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; roles: string[] },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.socialAccounts.assertIsBrandOwnerOrAdmin(id, user);
    return this.socialAccounts.getMetricsHistory(id, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  // Atajo para no esperar el cron automático de cada 6h — mismo criterio
  // que POST /campaigns/:id/metrics/refresh (MetricsCronService).
  @Post(':id/metrics-history/refresh')
  @RequirePermission('marcas', 'ver')
  async refreshMetricsHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { sub: string; roles: string[] }) {
    await this.socialAccounts.assertIsBrandOwnerOrAdmin(id, user);
    await this.accountMetricsCron.generateAccountMetrics({ brandId: id, ignoreRecentWindow: true });
    return this.socialAccounts.getMetricsHistory(id);
  }
}
