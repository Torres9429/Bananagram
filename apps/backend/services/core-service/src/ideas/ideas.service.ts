import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma/client';
import { ContentIdeaSource } from '../../node_modules/.prisma-client';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';

type CurrentUser = { sub: string; role: string };

@Injectable()
export class IdeasService {
  async listByCampaign(campaignId: string, user: CurrentUser): Promise<any> {
    await this.assertCampaignAccess(campaignId, user);
    return prisma.contentIdea.findMany({
      where: { campaignId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIdea(id: string, user: CurrentUser): Promise<any> {
    const idea = await prisma.contentIdea.findFirst({ where: { id, deletedAt: null } });
    if (!idea) throw new NotFoundException(`ContentIdea ${id} no existe`);
    await this.assertCampaignAccess(idea.campaignId, user);
    return idea;
  }

  async createIdea(dto: CreateIdeaDto, user: CurrentUser): Promise<any> {
    await this.assertCampaignAccess(dto.campaignId, user);
    return prisma.contentIdea.create({
      data: {
        campaignId: dto.campaignId,
        text: dto.text,
        title: dto.title,
        source: (dto.source as ContentIdeaSource) ?? ContentIdeaSource.propia,
        createdBy: user.sub,
      },
    });
  }

  async updateIdea(id: string, dto: UpdateIdeaDto, user: CurrentUser): Promise<any> {
    await this.getIdea(id, user);
    this.assertAtLeastOneProvided(dto);

    return prisma.contentIdea.update({
      where: { id },
      data: { text: dto.text, title: dto.title },
    });
  }

  async removeIdea(id: string, user: CurrentUser): Promise<any> {
    await this.getIdea(id, user);
    return prisma.contentIdea.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async assertCampaignAccess(campaignId: string, user: CurrentUser) {
    if (user.role === 'administrador') return;

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

  private assertAtLeastOneProvided(dto: object): void {
    const hasAnyValue = Object.values(dto).some((value) => value !== undefined && value !== null);
    if (!hasAnyValue) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }
  }
}
