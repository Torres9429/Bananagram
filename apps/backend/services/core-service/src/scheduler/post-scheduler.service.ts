import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { PostStatus } from '../types/post-status.enum';
import { PublishTarget, SOCIAL_PROVIDER, SocialProvider } from '../integrations/ayrshare/social-provider.interface';
import { computeAggregateStatus } from './post-aggregate-status.util';

// Cambia el fromStatus de PostStatusHistory a un valor "system" (sin
// constraint de BD sobre changedBy, mismo patrón que el resto del proyecto)
// — la transición la dispara el timer, no un usuario real.
const SYSTEM_ACTOR = 'system';

// Límite real de Node para el delay de setTimeout (entero de 32 bits) — más
// allá de esto, el delay se trunca/desborda en vez de esperar lo pedido.
const MAX_TIMEOUT_MS = 2_147_483_647;

type PostWithPublishRelations = Awaited<ReturnType<typeof prisma.post.findFirst>> & {
  brand: { profileKey: string | null; id: string };
  socialNetworks: { socialNetworkId: string }[];
  media: { media: { url: string } }[];
};

// Sin sondeo: en vez de preguntar "¿ya es hora?" cada N minutos (el diseño
// anterior, @Cron), cada post arma su propio temporizador exacto en el
// momento en que se programa (posts.service.ts.schedulePost llama
// scheduleTimer) — el proceso se despierta solo cuando corresponde, nunca
// antes. onModuleInit() re-arma los timers al arrancar (cubre reinicios:
// los timers en memoria se pierden, esto los reconstruye desde la BD) — es
// la única "red de seguridad" que hace falta, no un cron adicional.
@Injectable()
export class PostSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PostSchedulerService.name);

  constructor(
    @Inject(SOCIAL_PROVIDER) private readonly provider: SocialProvider,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const pending = await prisma.post.findMany({
      where: { status: PostStatus.PROGRAMADO, deletedAt: null },
      select: { id: true, scheduledAt: true },
    });
    for (const post of pending) {
      this.scheduleTimer(post.id, post.scheduledAt ?? new Date());
    }
    if (pending.length > 0) {
      this.logger.log(`Re-armados ${pending.length} timers de publicación al arrancar`);
    }
  }

  // Llamado desde posts.service.ts.schedulePost() justo después de
  // confirmar la transición a PROGRAMADO.
  scheduleTimer(postId: string, scheduledAt: Date): void {
    this.armTimer(postId, scheduledAt);
  }

  // Llamado desde posts.service.ts.cancelPost() — si el post nunca llegó a
  // tener un timer vivo (ej. justo después de un restart, antes de que
  // onModuleInit corra), doesExist evita el throw de deleteTimeout.
  cancelTimer(postId: string): void {
    const name = this.timerName(postId);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }
  }

  private timerName(postId: string): string {
    return `post-${postId}`;
  }

  private armTimer(postId: string, scheduledAt: Date): void {
    const name = this.timerName(postId);
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
    }

    const delay = Math.max(0, scheduledAt.getTime() - Date.now());

    if (delay > MAX_TIMEOUT_MS) {
      // Posts programados con semanas/meses de anticipación superan el
      // delay máximo de setTimeout — se espera el máximo permitido y, al
      // cumplirse, se vuelve a armar con el tiempo restante (encadenado
      // hasta llegar a la fecha real).
      const timeout = setTimeout(() => this.armTimer(postId, scheduledAt), MAX_TIMEOUT_MS);
      this.schedulerRegistry.addTimeout(name, timeout);
      return;
    }

    const timeout = setTimeout(() => {
      this.schedulerRegistry.deleteTimeout(name);
      this.publishById(postId).catch((error) => {
        this.logger.error(`Error publicando el post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, delay);
    this.schedulerRegistry.addTimeout(name, timeout);
  }

  // Separado de publishOne (que ya no recibe el post como parámetro
  // capturado en el momento de programar) — se busca fresco al momento de
  // disparar, por si algo cambió entre programar y publicar (media, redes
  // conectadas, etc.), mismo criterio que ya tenía el sondeo viejo.
  private async publishById(postId: string): Promise<void> {
    const post = await prisma.post.findFirst({
      where: { id: postId, status: PostStatus.PROGRAMADO, deletedAt: null },
      include: {
        brand: true,
        socialNetworks: true,
        media: { include: { media: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!post) {
      // Pudo cancelarse justo antes de que el timer disparara (carrera
      // benigna) — cancelTimer ya debería haber limpiado esto, pero por si
      // el timer alcanzó a dispararse antes de que cancelTimer corriera.
      return;
    }

    try {
      await this.publishOne(post as PostWithPublishRelations);
    } catch (error) {
      this.logger.error(`Error publicando el post ${postId}: ${error instanceof Error ? error.message : String(error)}`);
      // Bug real encontrado en vivo (Fase P1): si publishOne ya alcanzó a
      // transicionar a PUBLICANDO y provider.publish() lanza después (p.ej.
      // Ayrshare rechaza el request), el post quedaba trabado en
      // PUBLICANDO para siempre. Recupera el estado actual y, si sigue en
      // PUBLICANDO, lo cierra como ERROR (idempotente: si publishOne nunca
      // llegó a transicionar, esto es un no-op).
      await this.markStuckPublishingAsError(postId);
    }
  }

  private async publishOne(post: PostWithPublishRelations) {
    await this.transitionTo(post.id, post.status as PostStatus, PostStatus.PUBLICANDO);

    // Re-resolver PostSocialNetwork → SocialAccount: la marca pudo haber
    // desconectado una red entre programar el post y que dispare el timer.
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

    const mediaUrls = post.media.map((postMedia) => postMedia.media.url);

    // Una sola llamada, todas las redes (así funciona la API de Ayrshare).
    const results = await this.provider.publish(post.brand.profileKey, post.id, post.content, targets, mediaUrls);

    const now = new Date();
    for (const result of results) {
      await prisma.postSocialAccount.upsert({
        where: { postId_socialAccountId: { postId: post.id, socialAccountId: result.socialAccountId } },
        create: {
          postId: post.id,
          socialAccountId: result.socialAccountId,
          status: result.status,
          socialPostId: result.socialPostId,
          postUrl: result.postUrl,
          providerStatus: result.providerStatus,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          submittedAt: now,
          publishedAt: result.status === 'publicado' ? now : undefined,
        },
        update: {
          status: result.status,
          socialPostId: result.socialPostId,
          postUrl: result.postUrl,
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

  private async markStuckPublishingAsError(postId: string): Promise<void> {
    const current = await prisma.post.findFirst({ where: { id: postId }, select: { status: true } });
    if (current?.status !== PostStatus.PUBLICANDO) return;
    await this.transitionTo(postId, PostStatus.PUBLICANDO, PostStatus.ERROR);
  }

  private async transitionTo(postId: string, fromStatus: PostStatus, toStatus: PostStatus, publishedAt?: Date) {
    await prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id: postId }, data: { status: toStatus as any, publishedAt } });
      await tx.postStatusHistory.create({
        data: { postId, fromStatus: fromStatus as any, toStatus: toStatus as any, changedBy: SYSTEM_ACTOR },
      });
    });
  }
}
