import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

// A diferencia de la versión vieja (commons/guards/brand-access.guard.ts,
// ya eliminada), este guard NO depende de `brandIds` del JWT — bajo el
// modelo separado (docs/base/modelo2.txt) Brand/Campaign viven en la propia
// base de core-service, así que valida acceso con una consulta LOCAL usando
// el userId del JWT (`user.sub`), sin llamada HTTP ni datos embebidos que
// puedan quedar desactualizados durante la vida del access token.
//
// Acceso a una marca = (a) el usuario es su dueño (Brand.ownerId, siempre un
// Cliente), o (b) el usuario es CM o Diseñador de alguna campaña de esa
// marca (Campaign.cmId / CampaignDesigner.userId) — CM/Diseñador se vinculan
// vía campaña, nunca directo a la marca (ver CLAUDE.md).
@Injectable()
export class BrandAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const brandId = request.params.brandId || request.params.id;

    if (!brandId) {
      return true;
    }

    // administrador gestiona cualquier marca, igual que ya hace
    // CampaignsService.assertCanManage — sin este bypass, un admin con el
    // permiso de módulo `marcas:*` (PermissionGuard) igual quedaría
    // bloqueado aquí por no ser dueño ni CM/diseñador de ninguna campaña.
    if (user.roles?.includes('administrador')) {
      return true;
    }

    const hasAccess = await this.userHasBrandAccess(user.sub, brandId);
    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a esta marca');
    }

    return true;
  }

  private async userHasBrandAccess(userId: string, brandId: string): Promise<boolean> {
    const ownedBrand = await prisma.brand.findFirst({
      where: { id: brandId, deletedAt: null, ownerId: userId },
      select: { id: true },
    });
    if (ownedBrand) {
      return true;
    }

    const campaignMembership = await prisma.campaign.findFirst({
      where: {
        brandId,
        deletedAt: null,
        OR: [{ cmId: userId }, { designers: { some: { userId } } }],
      },
      select: { id: true },
    });

    return campaignMembership !== null;
  }
}
