import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { SOCIAL_PROVIDER, SocialProvider } from '../integrations/ayrshare/social-provider.interface';
import { ScoreService } from '../score/score.service';

const SYNC_WINDOW_HOURS = 5; // mismo criterio que MetricsCronService — evita duplicar si corre 2 veces en la misma ventana

// A diferencia de MetricsCronService (que solo mira posts publicados), este
// cron cubre TODAS las cuentas sociales conectadas, tengan o no campañas —
// es lo que permite mostrar crecimiento de cuenta desde el día 1, no solo
// desde la primera campaña. También dispara el Score por marca (mismo
// ciclo, para no duplicar el scheduler) — ScoreService.calculate() ya no se
// llama desde el controller en cada GET (ver score.controller.ts).
@Injectable()
export class AccountMetricsCronService {
  private readonly logger = new Logger(AccountMetricsCronService.name);

  constructor(
    @Inject(SOCIAL_PROVIDER) private readonly provider: SocialProvider,
    private readonly scoreService: ScoreService,
  ) {}

  @Cron('0 */6 * * *') // cada 6 horas
  async generateAccountMetrics(options?: { brandId?: string; ignoreRecentWindow?: boolean }) {
    const syncRun = await prisma.metricSyncRun.create({ data: { status: 'running' } });

    const socialAccounts = await prisma.socialAccount.findMany({
      where: {
        active: true,
        deletedAt: null,
        ...(options?.brandId ? { brandId: options.brandId } : {}),
      },
      include: { brand: true, socialNetwork: true },
    });

    let processed = 0;
    let failed = 0;

    for (const account of socialAccounts) {
      try {
        if (!options?.ignoreRecentWindow) {
          const alreadySynced = await this.wasRecentlySynced(account.id);
          if (alreadySynced) continue;
        }

        if (!account.brand.profileKey) {
          this.logger.warn(`SocialAccount ${account.id}: la marca no tiene profileKey de Ayrshare, se omite`);
          continue;
        }

        const metrics = await this.provider.getAccountMetrics(account.brand.profileKey, account.socialNetwork.code);
        if (metrics.followers === null) {
          failed++;
          continue;
        }

        await prisma.socialAccountMetricSnapshot.create({
          data: {
            socialAccountId: account.id,
            followers: metrics.followers,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            views: metrics.views,
            reach: metrics.reach,
            source: metrics.source,
          },
        });
        processed++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Error capturando snapshot de cuenta ${account.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Score por marca — una vez por ciclo, no por cada SocialAccount (una
    // marca puede tener varias redes conectadas).
    const brandIds = [...new Set(socialAccounts.map((account) => account.brandId))];
    for (const brandId of brandIds) {
      try {
        await this.scoreService.calculateIfStale(brandId);
      } catch (error) {
        this.logger.error(`Error calculando score de la marca ${brandId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await prisma.metricSyncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), itemsProcessed: processed, itemsFailed: failed, status: 'completed' },
    });

    this.logger.log(`Snapshots de cuenta: ${processed} ok, ${failed} fallidos de ${socialAccounts.length} cuentas conectadas`);

    return { processed, failed };
  }

  private async wasRecentlySynced(socialAccountId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - SYNC_WINDOW_HOURS * 3600 * 1000);
    const recentSnapshot = await prisma.socialAccountMetricSnapshot.findFirst({
      where: { socialAccountId, capturedAt: { gte: windowStart } },
      select: { id: true },
    });
    return !!recentSnapshot;
  }
}
