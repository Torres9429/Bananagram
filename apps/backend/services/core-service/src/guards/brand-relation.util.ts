import { prisma } from '../prisma/client';

// Frontera de tenant/ownership reutilizada por varios services (campañas,
// score, reportes) para decidir SOBRE QUÉ marca puede un usuario ejercer una
// acción ya autorizada por su permiso RBAC (campanas:crear, score:ver,
// reportes:exportar) — el permiso decide SI puede, esto decide SOBRE QUÉ
// recurso. Mismo criterio que ya usa BrandAccessGuard.userHasBrandAccess y
// CampaignsService.assertCanView: dueño de la marca, o CM/Diseñador de
// alguna campaña YA EXISTENTE de esa marca. No se toca BrandAccessGuard (no
// forma parte de esta tarea) — esta función es la versión reutilizable para
// los 3 services nuevos que la necesitan.
export async function userHasBrandRelation(brandId: string, brandOwnerId: string, userId: string): Promise<boolean> {
  if (brandOwnerId === userId) return true;

  const membership = await prisma.campaign.findFirst({
    where: {
      brandId,
      deletedAt: null,
      OR: [{ cmId: userId }, { designers: { some: { userId } } }],
    },
    select: { id: true },
  });

  return membership !== null;
}
