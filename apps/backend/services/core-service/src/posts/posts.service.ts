import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '../../node_modules/.prisma-client';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { CreatePostDto } from './dto/create-post.dto';
import { validateTransition } from './state-machine/post-state-machine';

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

    const socialNetworks = await prisma.socialNetwork.findMany({
      where: { id: { in: dto.socialNetworkIds }, deletedAt: null },
      select: { id: true },
    });
    if (socialNetworks.length !== dto.socialNetworkIds.length) {
      throw new BadRequestException('Una o más redes sociales indicadas no son válidas');
    }

    return prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          brandId: dto.brandId,
          campaignId: dto.campaignId,
          content: dto.content.trim(),
          instructions: dto.instructions?.trim() || undefined,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          createdBy: user.sub,
          status: PostStatus.BORRADOR,
          socialNetworks: {
            create: dto.socialNetworkIds.map((socialNetworkId) => ({
              socialNetwork: { connect: { id: socialNetworkId } },
            })),
          },
        },
      });

      return tx.post.findUniqueOrThrow({
        where: { id: post.id },
        include: {
          socialNetworks: { include: { socialNetwork: true } },
        },
      });
    });
  }

  async submitPostForReview(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { campaign: true },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    if (user.role !== 'community_manager' || post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para enviar esta publicación a revisión');
    }

    validateTransition(post.status as PostStatus, PostStatus.EN_REVISION, undefined, post.createdBy, user.sub);

    return prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.EN_REVISION },
      });

      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.EN_REVISION,
          changedBy: user.sub,
        },
      });

      return updatedPost;
    });
  }
}