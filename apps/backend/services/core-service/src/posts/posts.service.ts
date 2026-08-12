import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '../../node_modules/.prisma-client';
import { CloudinaryService, UploadableFile } from '../cloudinary/cloudinary.service';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { CreatePostDto } from './dto/create-post.dto';
import { RejectPostDto } from './dto/reject-post.dto';
import { SchedulePostDto } from './dto/schedule-post.dto';
import { validateTransition } from './state-machine/post-state-machine';

type CurrentUser = { sub: string; roles: string[] };

@Injectable()
export class PostsService {
  constructor(private readonly cloudinary: CloudinaryService) {}

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

    if (!user.roles.includes('administrador') && brand.ownerId !== user.sub && campaign.cmId !== user.sub) {
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

    if (!user.roles.includes('community_manager') || post.campaign.cmId !== user.sub) {
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

  // Aprobar/rechazar es acción del Cliente (dueño de la marca) — mismo
  // criterio de pertenencia que createPost/attachMediaToPost (bypass para
  // administrador, comparación directa contra brand.ownerId).
  async approvePost(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { brand: true } });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.brand.ownerId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para aprobar esta publicación');
    }

    // validateTransition también bloquea la auto-aprobación (createdBy === userId).
    validateTransition(post.status as PostStatus, PostStatus.APROBADO, undefined, post.createdBy, user.sub);

    return prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.APROBADO } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.APROBADO, changedBy: user.sub },
      });
      return updatedPost;
    });
  }

  async rejectPost(postId: string, dto: RejectPostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { brand: true } });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.brand.ownerId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para rechazar esta publicación');
    }

    // El comentario obligatorio ya lo exige validateTransition (regla de negocio #4).
    validateTransition(post.status as PostStatus, PostStatus.RECHAZADO, dto.comment, post.createdBy, user.sub);

    return prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.RECHAZADO } });
      await tx.postStatusHistory.create({
        data: {
          postId,
          fromStatus: post.status,
          toStatus: PostStatus.RECHAZADO,
          changedBy: user.sub,
          comment: dto.comment,
        },
      });
      return updatedPost;
    });
  }

  // Programar es acción del CM de la campaña — mismo criterio de pertenencia
  // que submitPostForReview, pero con bypass de administrador (consistente
  // con el resto del service, no con la variante más estricta de ese método).
  async schedulePost(postId: string, dto: SchedulePostDto, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { campaign: true, socialNetworks: { include: { socialNetwork: true } } },
    });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para programar esta publicación');
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : post.scheduledAt;
    if (!scheduledAt) {
      throw new BadRequestException('Debes indicar una fecha de programación');
    }

    // No se puede programar un post para una red que la marca no tiene
    // conectada — el scheduler (Fase 4) asume que toda PostSocialNetwork
    // resuelve a una SocialAccount real al momento de publicar.
    const socialNetworkIds = post.socialNetworks.map((psn) => psn.socialNetworkId);
    const connectedAccounts = await prisma.socialAccount.findMany({
      where: { brandId: post.brandId, socialNetworkId: { in: socialNetworkIds }, active: true, deletedAt: null },
      select: { socialNetworkId: true },
    });
    const connectedNetworkIds = new Set(connectedAccounts.map((account) => account.socialNetworkId));
    const missingNetworks = post.socialNetworks
      .filter((psn) => !connectedNetworkIds.has(psn.socialNetworkId))
      .map((psn) => psn.socialNetwork.name);
    if (missingNetworks.length > 0) {
      throw new BadRequestException(
        `La marca no tiene conectadas estas redes sociales: ${missingNetworks.join(', ')}`,
      );
    }

    validateTransition(post.status as PostStatus, PostStatus.PROGRAMADO, undefined, post.createdBy, user.sub);

    return prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: { status: PostStatus.PROGRAMADO, scheduledAt },
      });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.PROGRAMADO, changedBy: user.sub },
      });
      return updatedPost;
    });
  }

  async cancelPost(postId: string, user: CurrentUser): Promise<any> {
    const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { campaign: true } });
    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }
    if (!user.roles.includes('administrador') && post.campaign.cmId !== user.sub) {
      throw new ForbiddenException('No tienes permiso para cancelar esta publicación');
    }

    validateTransition(post.status as PostStatus, PostStatus.CANCELADO, undefined, post.createdBy, user.sub);

    return prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({ where: { id: postId }, data: { status: PostStatus.CANCELADO } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: post.status, toStatus: PostStatus.CANCELADO, changedBy: user.sub },
      });
      return updatedPost;
    });
  }

  async attachMediaToPost(postId: string, files: UploadableFile[] | undefined, user: CurrentUser): Promise<any> {
    if (!files?.length) {
      throw new BadRequestException('Debes adjuntar al menos un archivo');
    }

    const invalidFile = files.find(
      (file) => !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'),
    );
    if (invalidFile) {
      throw new BadRequestException('Solo se admiten imágenes o videos');
    }

    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { brand: true, campaign: { include: { designers: true } } },
    });

    if (!post) {
      throw new NotFoundException('La publicación indicada no existe o fue eliminada');
    }

    if (post.status !== PostStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden adjuntar recursos a una publicación en borrador');
    }

    if (
      !user.roles.includes('administrador') &&
      post.brand.ownerId !== user.sub &&
      post.campaign.cmId !== user.sub &&
      !post.campaign.designers.some((designer) => designer.userId === user.sub)
    ) {
      throw new ForbiddenException('No tienes permiso para adjuntar recursos a esta publicación');
    }

    const uploadedFiles = [] as Array<{
      public_id?: string;
      secure_url?: string;
      url?: string;
      width?: number;
      height?: number;
      duration?: number;
    }>;

    try {
      for (const file of files) {
        uploadedFiles.push(await this.cloudinary.uploadFile(file));
      }

      return await prisma.$transaction(async (tx) => {
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            media: {
              create: uploadedFiles.map((uploadedFile, index) => ({
                order: index + 1,
                media: {
                  create: {
                    brandId: post.brandId,
                    fileName: uploadedFile.public_id || files[index].originalname,
                    originalName: files[index].originalname,
                    mimeType: files[index].mimetype,
                    url: uploadedFile.secure_url || uploadedFile.url || '',
                    size: files[index].size,
                    width: uploadedFile.width,
                    height: uploadedFile.height,
                    duration: uploadedFile.duration,
                  },
                },
              })),
            },
          },
          include: {
            media: { include: { media: true }, orderBy: { order: 'asc' } },
          },
        });

        return updatedPost;
      });
    } catch (error) {
      await Promise.all(uploadedFiles.map((uploadedFile) => uploadedFile.public_id && this.cloudinary.deleteFile(uploadedFile.public_id)));
      throw error;
    }
  }
}