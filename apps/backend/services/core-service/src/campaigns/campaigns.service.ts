import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { CampaignStatus } from '../../node_modules/.prisma-client';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

type CurrentUser = { sub: string; role: string };

const INCLUDE = { designers: true, categories: true } as const;

@Injectable()
export class CampaignsService {
  async listCampaigns(user: CurrentUser): Promise<any> {
    if (user.role === 'administrador') {
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
    if (user.role === 'administrador' || campaign.cmId === user.sub) return;

    const brand = await prisma.brand.findFirst({ where: { id: campaign.brandId, ownerId: user.sub } });
    if (!brand) throw new ForbiddenException('No tienes acceso a esta campaña');
  }

  // Regla de negocio: el Cliente crea la campaña para una marca suya y
  // elige un único CM (cmId). Se valida aquí, no solo con el permiso de
  // módulo — `campanas:crear` en el seed también lo tiene community_manager
  // (para poder operar campañas existentes), pero crear una campaña nueva
  // sigue siendo un acto del dueño de la marca (o de un Administrador).
  async createCampaign(dto: CreateCampaignDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) throw new BadRequestException('La marca especificada no existe o fue eliminada');

    if (user.role !== 'administrador' && brand.ownerId !== user.sub) {
      throw new ForbiddenException('Solo el dueño de la marca puede crear campañas para ella');
    }

    await this.assertUserHasRole(dto.cmId, 'cm', 'El usuario seleccionado no corresponde a un Community Manager');

    return prisma.campaign.create({
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
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    await this.assertCanManage(campaign, user);
    this.assertAtLeastOneProvided(dto);

    // Regla de negocio (RF-2.3): el Community Manager queda bloqueado
    // permanentemente tras la creación de la campaña — a diferencia del
    // resto de los campos, no se ignora en silencio, se rechaza la request.
    if (dto.cmId !== undefined) {
      throw new BadRequestException('El community manager de una campaña no se puede reasignar después de creada');
    }

    return prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        objective: dto.objective,
        status: dto.status as CampaignStatus | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: INCLUDE,
    });
  }

  async removeCampaign(id: string, user: CurrentUser): Promise<any> {
    const campaign = await this.getCampaign(id);
    await this.assertCanManage(campaign, user);
    return prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Regla de negocio #3: el CM selecciona a los Diseñadores de su campaña —
  // solo el CM asignado (o un Administrador) puede agregar/quitar.
  async assignDesigner(campaignId: string, designerUserId: string, user: CurrentUser) {
    const campaign = await this.getCampaign(campaignId);
    this.assertIsAssignedCm(campaign, user);
    await this.assertUserHasRole(designerUserId, 'disenador', 'El usuario asignado no tiene rol de Diseñador');

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
  async listEligibleCommunityManagers(): Promise<any> {
    return this.listProfilesByRole('cm');
  }

  async listEligibleDesigners(): Promise<any> {
    return this.listProfilesByRole('disenador');
  }

  private listProfilesByRole(roleName: string) {
    return prisma.userProfile.findMany({
      where: { roleName, deletedAt: null },
      select: { userId: true, name: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  private async assertUserHasRole(userId: string, roleName: string, errorMessage: string): Promise<void> {
    const profile = await prisma.userProfile.findFirst({ where: { userId, roleName, deletedAt: null } });
    if (!profile) throw new BadRequestException(errorMessage);
  }

  private assertIsAssignedCm(campaign: { cmId: string }, user: CurrentUser) {
    if (user.role !== 'administrador' && campaign.cmId !== user.sub) {
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
