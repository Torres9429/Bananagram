import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { PublishTarget, SOCIAL_PROVIDER, SocialProvider } from '../integrations/ayrshare/social-provider.interface';
import { computeAggregateStatus } from './post-aggregate-status.util';

// Cambia el fromStatus de PostStatusHistory a un valor "system" (sin
// constraint de BD sobre changedBy, mismo patrón que el resto del proyecto)
// — primera vez que una transición la dispara el cron, no un usuario real.
const SYSTEM_ACTOR = 'system';

type ScheduledPost = Awaited<ReturnType<typeof prisma.post.findMany>>[number];

@Injectable()
export class PostSchedulerService {
  private readonly logger = new Logger(PostSchedulerService.name);

  constructor(@Inject(SOCIAL_PROVIDER) private readonly provider: SocialProvider) {}

  @Cron('* * * * *') // cada minuto
  async publishScheduledPosts() {
    const posts = await prisma.post.findMany({
      where: { status: PostStatus.PROGRAMADO, scheduledAt: { lte: new Date() }, deletedAt: null },
      include: { brand: true, socialNetworks: true },
    });

    for (const post of posts) {
      // Un post que truena no debe detener el resto del batch (auditoría §10.5).
      try {
        await this.publishOne(post);
      } catch (error) {
        this.logger.error(
          `Error publicando el post ${post.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async publishOne(post: ScheduledPost & { brand: { profileKey: string | null }; socialNetworks: { socialNetworkId: string }[] }) {
    await this.transitionTo(post.id, post.status as PostStatus, PostStatus.PUBLICANDO);

    // Re-resolver PostSocialNetwork → SocialAccount: la marca pudo haber
    // desconectado una red entre programar el post y que corra el cron.
    const socialNetworkIds = post.socialNetworks.map((psn) => psn.socialNetworkId);
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { brandId: post.brandId, socialNetworkId: { in: socialNetworkIds }, active: true, deletedAt: null },
      include: { socialNetwork: true },
    });

    if (socialAccounts.length === 0) {
      this.logger.warn(`Post ${post.id}: ninguna de sus redes sigue conectada, se marca error`);
      await this.transitionTo(post.id, PostStatus.PUBLICANDO, PostStatus.ERROR);
      return;
    }

    if (!post.brand.profileKey) {
      this.logger.warn(`Post ${post.id}: la marca ${post.brandId} no tiene profileKey de Ayrshare`);
      await this.transitionTo(post.id, PostStatus.PUBLICANDO, PostStatus.ERROR);
      return;
    }

    const targets: PublishTarget[] = socialAccounts.map((account) => ({
      socialAccountId: account.id,
      networkCode: account.socialNetwork.code,
    }));

    // Una sola llamada, todas las redes (así funciona la API de Ayrshare).
    const results = await this.provider.publish(post.brand.profileKey, post.id, post.content, targets);

    const now = new Date();
    for (const result of results) {
      await prisma.postSocialAccount.upsert({
        where: { postId_socialAccountId: { postId: post.id, socialAccountId: result.socialAccountId } },
        create: {
          postId: post.id,
          socialAccountId: result.socialAccountId,
          status: result.status,
          socialPostId: result.socialPostId,
          providerStatus: result.providerStatus,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          submittedAt: now,
          publishedAt: result.status === 'publicado' ? now : undefined,
        },
        update: {
          status: result.status,
          socialPostId: result.socialPostId,
          providerStatus: result.providerStatus,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          submittedAt: now,
          publishedAt: result.status === 'publicado' ? now : undefined,
        },
      });
    }

    const aggregate = computeAggregateStatus(results.map((result) => result.status));
    await this.transitionTo(post.id, PostStatus.PUBLICANDO, aggregate, aggregate === PostStatus.PUBLICADO ? now : undefined);
  }

  private async transitionTo(postId: string, fromStatus: PostStatus, toStatus: PostStatus, publishedAt?: Date) {
    await prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id: postId }, data: { status: toStatus, publishedAt } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus, toStatus, changedBy: SYSTEM_ACTOR },
      });
    });
  }
}
