import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { AnalyticsContext, SOCIAL_PROVIDER, SocialProvider } from '../integrations/ayrshare/social-provider.interface';

const SYNC_WINDOW_HOURS = 5; // < 6h del cron — evita duplicar si corre 2 veces en la misma ventana (auditoría §9)

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  constructor(@Inject(SOCIAL_PROVIDER) private readonly provider: SocialProvider) {}

  @Cron('0 */6 * * *') // cada 6 horas
  async generateMetrics(options?: { campaignId?: string; ignoreRecentWindow?: boolean }) {
    const syncRun = await prisma.metricSyncRun.create({ data: { status: 'running' } });

    // Capa 2 (PostSocialAccount) es la publicación física por red — las
    // métricas cuelgan de ahí, no de Post directo (ver docs/base/modelo2.txt).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const postSocialAccounts = await prisma.postSocialAccount.findMany({
      where: {
        status: 'publicado',
        publishedAt: { gte: sevenDaysAgo },
        // options.campaignId acota el refresh manual (POST
        // /campaigns/:id/metrics/refresh) a una sola campaña — el cron
        // automático de arriba sigue corriendo sobre todo el sistema.
        ...(options?.campaignId ? { post: { campaignId: options.campaignId } } : {}),
      },
      include: {
        socialAccount: { include: { socialNetwork: true } },
        post: { include: { brand: true } },
      },
    });

    let processed = 0;
    let failed = 0;

    for (const psa of postSocialAccounts) {
      // Un fallo en un item no debe detener el resto del batch (auditoría §10.5).
      try {
        // El refresh manual ignora la ventana de "ya sincronizado
        // recientemente" a propósito — si el usuario le da clic a
        // "Actualizar" es porque quiere el dato más nuevo ahora, no que se
        // lo salte por haber corrido el cron automático hace poco.
        if (!options?.ignoreRecentWindow) {
          const alreadySynced = await this.wasRecentlySynced(psa.id);
          if (alreadySynced) continue;
        }

        if (!psa.socialPostId) {
          this.logger.warn(`PostSocialAccount ${psa.id} está publicado pero sin socialPostId, se omite`);
          continue;
        }
        if (!psa.post.brand.profileKey) {
          this.logger.warn(`PostSocialAccount ${psa.id}: la marca no tiene profileKey de Ayrshare, se omite`);
          continue;
        }

        const context: AnalyticsContext = {
          socialAccountId: psa.socialAccountId,
          networkCode: psa.socialAccount.socialNetwork.code,
          followers: psa.socialAccount.followers,
          baseEngagementRate: psa.socialAccount.socialNetwork.baseEngagementRate / 100,
          publishedAt: psa.publishedAt!,
        };

        const analytics = await this.provider.getAnalytics(psa.post.brand.profileKey, psa.socialPostId, context);

        await prisma.postMetric.create({
          data: {
            postSocialAccountId: psa.id,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            views: analytics.views,
            reach: analytics.reach,
            engagement: analytics.engagement,
            engagementBase: analytics.engagementBase,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw: analytics.raw as any,
            source: analytics.source,
          },
        });
        await prisma.postSocialAccount.update({ where: { id: psa.id }, data: { lastSyncedAt: new Date() } });
        processed++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Error sincronizando métricas de ${psa.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    await prisma.metricSyncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), itemsProcessed: processed, itemsFailed: failed, status: 'completed' },
    });

    this.logger.log(`Métricas sincronizadas: ${processed} ok, ${failed} fallidas de ${postSocialAccounts.length} publicaciones por red`);

    return { processed, failed };
  }

  private async wasRecentlySynced(postSocialAccountId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - SYNC_WINDOW_HOURS * 3600 * 1000);
    const recentCapture = await prisma.postMetric.findFirst({
      where: { postSocialAccountId, capturedAt: { gte: windowStart } },
      select: { id: true },
    });
    return !!recentCapture;
  }
}
