import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { BrandAccessGuard } from '../guards/brand-access.guard';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
import { BrandsService } from './brands.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { AccountMetricsCronService } from '../cron/account-metrics-cron.service';
import { S3Service, type UploadableFile } from '../storage/s3.service';
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
    private readonly storage: S3Service,
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

  // Sube el logo ANTES de que la marca exista (formulario de creación, no
  // hay :id todavía) — por eso no puede ser :id/logo ni llevar
  // BrandAccessGuard (nada que verificar ownership todavía). Se gatea con
  // el mismo permiso que crear la marca en sí (marcas:crear), no marcas:editar.
  // Ruta de 2 segmentos ('brands/logo') — no colisiona con POST :id/logo
  // (3 segmentos) ni con ningún otro verbo sobre brands/:id.
  @Post('logo')
  @ApiConsumes('multipart/form-data')
  @RequirePermission('marcas', 'crear')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5_000_000 } }))
  async uploadLogoForNewBrand(@UploadedFile() file: UploadableFile) {
    if (!file) throw new BadRequestException('Falta el archivo de imagen');
    const result = await this.storage.uploadFile(file, 'bananagram/brands');
    return { logoUrl: result.secure_url };
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

  // Sube el logo a S3 y devuelve la URL — a propósito NO toca
  // Brand.logoUrl acá (mismo criterio que internal/user-profiles/:id/avatar
  // en auth-service/core-service: una sola operación de guardado). El
  // frontend incluye la URL devuelta en el siguiente PATCH :id junto con el
  // resto del formulario de "Editar perfil".
  @Post(':id/logo')
  @ApiConsumes('multipart/form-data')
  @RequirePermission('marcas', 'editar')
  @UseGuards(BrandAccessGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5_000_000 } }))
  async uploadLogo(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: UploadableFile) {
    if (!file) throw new BadRequestException('Falta el archivo de imagen');
    const result = await this.storage.uploadFile(file, 'bananagram/brands');
    return { logoUrl: result.secure_url };
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

  // Totales de la cuenta completa ahora mismo (no serie histórica) — a
  // diferencia de GET campaigns/metrics-summary, no depende de que existan
  // campañas: cubre todas las publicaciones reales de cada red conectada.
  // Mismo guard que metrics-history (dueño de marca o Administrador).
  @Get(':id/account-metrics-summary')
  @RequirePermission('marcas', 'ver')
  async getAccountMetricsSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; roles: string[] },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.socialAccounts.assertIsBrandOwnerOrAdmin(id, user);
    return this.socialAccounts.getAccountMetricsSummary(id, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }
}
