import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { BrandAccessGuard } from '../guards/brand-access.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { SocialAccountsService } from './social-accounts.service';

// BrandAccessGuard lee request.params.brandId || request.params.id — con
// :brandId en la ruta funciona sin tocar el guard (ver nota de brandIds en
// CLAUDE.md sobre por qué campaigns no pudo reusarlo tal cual).
@ApiTags('social-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard, BrandAccessGuard)
@Controller('brands/:brandId/social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccounts: SocialAccountsService) {}

  @Get()
  @RequirePermission('marcas', 'ver')
  findAll(@Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.socialAccounts.listByBrand(brandId);
  }

  @Post('sync')
  @RequirePermission('marcas', 'editar')
  sync(@Param('brandId', ParseUUIDPipe) brandId: string) {
    return this.socialAccounts.syncFromAyrshare(brandId);
  }
}
