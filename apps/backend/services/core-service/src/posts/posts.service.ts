import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '../../node_modules/.prisma-client';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { CreatePostDto } from './dto/create-post.dto';

type CurrentUser = { sub: string; role: string };

@Injectable()
export class PostsService {
  async createPost(dto: CreatePostDto, user: CurrentUser): Promise<any> {
    const brand = await prisma.brand.findFirst({ where: { id: dto.brandId, deletedAt: null } });
    if (!brand) {
      throw new NotFoundException('La marca indicada no existe o fue eliminada');
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: dto.campaignId, brandId: dto.brandId, deletedAt: null, status: CampaignStatus.active },
    });
    if (!campaign) {
      throw new BadRequestException('La campaña indicada no es válida para esta marca');
    }

    if (user.role !== 'administrador' && brand.ownerId !== user.sub && campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para crear esta publicación');
    }

    return prisma.post.create({
      data: {
        brandId: dto.brandId,
        campaignId: dto.campaignId,
        content: dto.content.trim(),
        instructions: dto.instructions?.trim() || undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        createdBy: user.sub,
        status: PostStatus.BORRADOR,
      },
    });
  }
}