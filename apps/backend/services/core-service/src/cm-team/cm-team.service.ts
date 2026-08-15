import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';

// Equipo GENERAL de un CM (Fase J) — distinto de CampaignDesigner, que es
// por-campaña. Un Diseñador debe estar aquí antes de que CampaignsService.
// assignDesigner lo deje staffear una campaña puntual de este mismo CM.
@Injectable()
export class CmTeamService {
  async listMine(cmUserId: string) {
    const roster = await prisma.cmTeamMember.findMany({ where: { cmUserId }, orderBy: { createdAt: 'asc' } });
    if (!roster.length) return [];

    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: roster.map((r) => r.designerUserId) }, deletedAt: null },
      select: { userId: true, name: true, avatarUrl: true },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    return roster.map((r) => ({
      designerUserId: r.designerUserId,
      name: profileByUserId.get(r.designerUserId)?.name ?? 'Usuario',
      avatarUrl: profileByUserId.get(r.designerUserId)?.avatarUrl ?? null,
      addedAt: r.createdAt,
    }));
  }

  async add(cmUserId: string, designerUserId: string) {
    await this.assertUserHasRole(designerUserId, 'disenador', 'El usuario asignado no tiene rol de Diseñador');

    return this.runWithUniqueGuard(() => prisma.cmTeamMember.create({ data: { cmUserId, designerUserId } }));
  }

  async remove(cmUserId: string, designerUserId: string) {
    try {
      await prisma.cmTeamMember.delete({ where: { cmUserId_designerUserId: { cmUserId, designerUserId } } });
    } catch (error) {
      if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('Ese diseñador no está en tu equipo');
      }
      throw error;
    }
    return { removed: true };
  }

  private async assertUserHasRole(userId: string, roleName: string, errorMessage: string): Promise<void> {
    const profile = await prisma.userProfile.findFirst({
      where: { userId, roleNames: { has: roleName }, deletedAt: null },
    });
    if (!profile) throw new BadRequestException(errorMessage);
  }

  private async runWithUniqueGuard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ese diseñador ya está en tu equipo');
      }
      throw error;
    }
  }
}
