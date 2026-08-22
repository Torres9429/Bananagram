import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CampaignStatus, CmAssignmentStatus } from '../../node_modules/.prisma-client';
import { NotificationsClient } from '../notifications/notifications-client.service';
import { userHasBrandRelation } from '../guards/brand-relation.util';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

type CurrentUser = { sub: string; roles: string[] };

const INCLUDE = { designers: true, categories: true } as const;

@Injectable()
export class CampaignsService {
  constructor(private readonly notifications: NotificationsClient) {}
  async listCampaigns(user: CurrentUser): Promise<any> {
    if (user.roles.includes('administrador')) {
      return prisma.campaign.findMany({ where: { deletedAt: null }, include: INCLUDE, orderBy: { createdAt: 'desc' } });
    }

    return prisma.campaign.findMany({
      where: {
        deletedAt: null,
        OR: [
          { cmId: user.sub },
          { createdBy: user.sub },
          { brand: { ownerId: user.sub } },
          { designers: { some: { userId: user.sub } } },
        ],
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaign(id: string): Promise<any> {
    const campaign = await prisma.campaign.findFirst({ where: { id, deletedAt: null }, include: INCLUDE });
    if (!campaign) throw new NotFoundException(`Campaña no encontrada`);
    return campaign;
  }

  // Dueño de la marca, CM asignado o Administrador pueden gestionar la
  // campaña. No hay guard genérico para esto (a diferencia de Brand, el :id
  // de la ruta es un campaignId, no un brandId), así que se resuelve aquí
  // con una consulta local.
  private async assertCanManage(campaign: { id: string; brandId: string; cmId: string }, user: CurrentUser) {
    if (user.roles.includes('administrador') || campaign.cmId === user.sub) return;

    const brand = await prisma.brand.findFirst({ where: { id: campaign.brandId, ownerId: user.sub } });
    if (!brand) throw new ForbiddenException('No tienes acceso a esta campaña');
  }

  // Ver métricas es más permisivo que gestionar: además de dueño/CM/admin,
  // un Diseñador asignado también puede consultarlas (mismo criterio de
  // pertenencia ya usado en listCampaigns). Público porque lo llama también
  // CampaignsController antes de delegar a CampaignMetricsService.
  async assertCanView(campaignId: string, user: CurrentUser): Promise<void> {
    if (user.roles.includes('administrador')) return;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        deletedAt: null,
        OR: [
          { cmId: user.sub },
          { createdBy: user.sub },
          { brand: { ownerId: user.sub } },
          { designers: { some: { userId: user.sub } } },
        ],
      },
      select: { id: true },
    });
    if (!campaign) throw new ForbiddenException('No tienes acceso a esta campaña');
  }

  // La autoridad de SI puede crear campañas es el permiso RBAC
  // (`campanas:crear`, ya validado por PermissionGuard antes de llegar
  // aquí) — no un chequeo de rol. Lo que sigue determina SOBRE QUÉ marca:
  // el usuario debe tener alguna relación real con ella (dueño, o CM/
  // Diseñador de alguna campaña ya existente de esa marca), igual que
  // BrandAccessGuard/assertCanView — preserva el aislamiento multi-tenant
  // sin exigir ser exactamente el dueño. Decisión de producto confirmada
  // 2026-08-17: antes esto exigía brand.ownerId===user.sub exacto, lo que
  // dejaba `campanas:crear` sin efecto para cualquier rol que no fuera
  // Cliente/Admin aunque el permiso estuviera concedido.
  async createCampaign(dto: CreateCampaignDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) throw new BadRequestException('La marca especificada no existe o fue eliminada');

    if (!user.roles.includes('administrador') && !(await userHasBrandRelation(dto.brandId, brand.ownerId, user.sub))) {
      throw new ForbiddenException('No tienes relación con esta marca — no puedes crear campañas para ella');
    }

    await this.assertUserHasRole(dto.cmId, 'cm', 'El usuario seleccionado no corresponde a un Community Manager');

    const campaign = await prisma.campaign.create({
      data: {
        brandId: dto.brandId,
        name: dto.name,
        description: dto.description,
        objective: dto.objective,
        cmId: dto.cmId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy: user.sub,
        categories: dto.categoryIds?.length
          ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
      include: INCLUDE,
    });

    // Fire-and-forget: notificar es un efecto secundario best-effort, nunca
    // debe demorar la respuesta de creación (notify() ya atrapa sus propios
    // errores, no hay unhandled rejection).
    void this.notifications.notify(dto.cmId, 'campaign_pending_cm_approval', {
      campaignId: campaign.id,
      campaignName: campaign.name,
      brandId: campaign.brandId,
    });

    return campaign;
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    await this.assertCanManage(campaign, user);
    this.assertAtLeastOneProvided(dto);

    // Regla de negocio (RF-2.3, relajada en la Fase J): el CM queda
    // bloqueado solo una vez ACEPTÓ la campaña — antes de eso (pendiente, o
    // después de un rechazo) el Cliente puede intentar con otro. Reasignar
    // resetea el flujo de aceptación a 'pendiente' y notifica al CM nuevo.
    let cmReassignmentData: { cmId: string; cmStatus: CmAssignmentStatus; cmRespondedAt: null; cmRejectionReason: null } | undefined;
    if (dto.cmId !== undefined) {
      if (campaign.cmStatus === 'aceptada') {
        throw new BadRequestException('El community manager ya aceptó esta campaña, no se puede reasignar');
      }
      await this.assertUserHasRole(dto.cmId, 'cm', 'El usuario seleccionado no corresponde a un Community Manager');
      cmReassignmentData = { cmId: dto.cmId, cmStatus: 'pendiente', cmRespondedAt: null, cmRejectionReason: null };
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        objective: dto.objective,
        status: dto.status as CampaignStatus | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        ...cmReassignmentData,
      },
      include: INCLUDE,
    });

    if (cmReassignmentData) {
      void this.notifications.notify(cmReassignmentData.cmId, 'campaign_pending_cm_approval', {
        campaignId: updated.id,
        campaignName: updated.name,
        brandId: updated.brandId,
      });
    }

    return updated;
  }

  // El CM asignado confirma que va a trabajar la campaña — desbloquea
  // assignDesigner (regla nueva de la Fase J: no se arma equipo de una
  // campaña que el CM no ha confirmado todavía).
  async acceptCampaign(id: string, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    this.assertIsAssignedCm(campaign, user);
    if (campaign.cmStatus !== 'pendiente') {
      throw new BadRequestException('Esta campaña ya fue respondida');
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { cmStatus: 'aceptada', cmRespondedAt: new Date() },
      include: INCLUDE,
    });

    void this.notifications.notify(campaign.createdBy, 'campaign_accepted', {
      campaignId: updated.id,
      campaignName: updated.name,
    });

    return updated;
  }

  // Rechazo: la campaña queda disponible para que el Cliente reasigne cmId
  // (ver updateCampaign) — no se cancela ni se borra sola.
  async rejectCampaign(id: string, reason: string | undefined, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    this.assertIsAssignedCm(campaign, user);
    if (campaign.cmStatus !== 'pendiente') {
      throw new BadRequestException('Esta campaña ya fue respondida');
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { cmStatus: 'rechazada', cmRespondedAt: new Date(), cmRejectionReason: reason },
      include: INCLUDE,
    });

    void this.notifications.notify(campaign.createdBy, 'campaign_rejected', {
      campaignId: updated.id,
      campaignName: updated.name,
      reason,
    });

    return updated;
  }

  async removeCampaign(id: string, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    await this.assertCanManage(campaign, user);
    return prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Regla de negocio #3: el CM selecciona a los Diseñadores de su campaña —
  // solo el CM asignado (o un Administrador) puede agregar/quitar. Fase J:
  // dos reglas nuevas — (a) no se arma equipo de una campaña que el CM no
  // confirmó todavía, (b) el diseñador debe ya estar en el equipo GENERAL
  // del CM (CmTeamMember) antes de poder staffearlo en una campaña puntual.
  async assignDesigner(campaignId: string, designerUserId: string, user: CurrentUser) {
    const campaign = await this.getCampaign(campaignId);
    this.assertIsAssignedCm(campaign, user);

    if (campaign.cmStatus !== 'aceptada') {
      throw new BadRequestException('No se puede armar el equipo de una campaña que el CM todavía no aceptó');
    }

    const inRoster = await prisma.cmTeamMember.findUnique({
      where: { cmUserId_designerUserId: { cmUserId: campaign.cmId, designerUserId } },
    });
    if (!inRoster) {
      throw new BadRequestException('Este diseñador todavía no está en tu equipo general — agrégalo ahí primero');
    }

    return this.runWithUniqueGuard(() =>
      prisma.campaignDesigner.create({ data: { campaignId, userId: designerUserId } }),
    );
  }

  async unassignDesigner(campaignId: string, designerUserId: string, user: CurrentUser) {
    const campaign = await this.getCampaign(campaignId);
    this.assertIsAssignedCm(campaign, user);

    await prisma.campaignDesigner.delete({
      where: { campaignId_userId: { campaignId, userId: designerUserId } },
    });
    return { removed: true };
  }

  // Selectores de RF-2.1/RF-2.2 (elegir CM al crear la campaña, elegir
  // Diseñador al asignarlo). No se puede reusar GET /admin/users?roleName=
  // de auth-service: ese endpoint requiere el permiso `usuarios:ver`, que en
  // el seed solo tiene `administrador` — ni Cliente (crea la campaña) ni CM
  // (asigna diseñadores) lo tienen. roleName se lee de UserProfile, que
  // core-service ya guarda localmente (ver POST /internal/user-profiles).
  //
  // Fase J: nunca filtra a nadie fuera (el buscador del frontend necesita
  // poder encontrar a cualquiera) — solo ordena por matchScore descendente,
  // el frontend corta los primeros 5 como "recomendados".
  async listEligibleCommunityManagers(categoryIds?: string[]): Promise<any> {
    const cms = await prisma.userProfile.findMany({
      where: { roleNames: { has: 'cm' }, deletedAt: null },
      select: { userId: true, name: true, avatarUrl: true, categories: { select: { categoryId: true } } },
      orderBy: { name: 'asc' },
    });

    const wanted = new Set(categoryIds ?? []);
    return cms
      .map((cm) => ({
        userId: cm.userId,
        name: cm.name,
        avatarUrl: cm.avatarUrl,
        matchScore: wanted.size ? cm.categories.filter((c) => wanted.has(c.categoryId)).length : 0,
      }))
      .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));
  }

  async listEligibleDesigners(): Promise<any> {
    return this.listProfilesByRole('disenador');
  }

  private listProfilesByRole(roleName: string) {
    return prisma.userProfile.findMany({
      where: { roleNames: { has: roleName }, deletedAt: null },
      select: { userId: true, name: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  private async assertUserHasRole(userId: string, roleName: string, errorMessage: string): Promise<void> {
    const profile = await prisma.userProfile.findFirst({
      where: { userId, roleNames: { has: roleName }, deletedAt: null },
    });
    if (!profile) throw new BadRequestException(errorMessage);
  }

  private assertIsAssignedCm(campaign: { cmId: string }, user: CurrentUser) {
    if (!user.roles.includes('administrador') && campaign.cmId !== user.sub) {
      throw new ForbiddenException('Solo el CM asignado a esta campaña puede gestionar sus diseñadores');
    }
  }

  private async runWithUniqueGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ese diseñador ya está asignado a la campaña');
      }
      throw error;
    }
  }

  private assertAtLeastOneProvided(dto: object): void {
    const hasAnyValue = Object.values(dto).some((value) => value !== undefined && value !== null);
    if (!hasAnyValue) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }
  }
}
