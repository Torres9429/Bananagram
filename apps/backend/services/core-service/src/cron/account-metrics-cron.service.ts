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
  // Mismo mutex en memoria que MetricsCronService — evita que el cron
  // automático y el refresh manual (POST /brands/:id/metrics-history/refresh)
  // corran en paralelo sobre la misma instancia singleton (auditoría §3).
  private isRunning = false;

  constructor(
    @Inject(SOCIAL_PROVIDER) private readonly provider: SocialProvider,
    private readonly scoreService: ScoreService,
  ) {}

  @Cron('0 */6 * * *') // cada 6 horas
  async generateAccountMetrics(options?: { brandId?: string; ignoreRecentWindow?: boolean }) {
    if (this.isRunning) {
      this.logger.warn('Ya hay una sincronización de métricas de cuenta en curso — se omite esta corrida para evitar duplicados');
      return { processed: 0, failed: 0, skipped: true };
    }
    this.isRunning = true;
    try {
      return await this.runSync(options);
    } finally {
      this.isRunning = false;
    }
  }

  private async runSync(options?: { brandId?: string; ignoreRecentWindow?: boolean }) {
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

        // Bug real encontrado en vivo (2026-08-19): una sola respuesta lenta
        // de Ayrshare para UNA parte de la captura (ej. el enriquecimiento
        // de historial de Facebook, ver fetchFacebookHistorySummary) bastaba
        // para que esta llamada devolviera followers real pero
        // likes/comments/shares/views/posts en null — y como el dashboard
        // siempre muestra la captura MÁS RECIENTE, ese null "ganaba" y
        // borraba de la vista el último dato bueno conocido hasta el
        // siguiente refresh. Se compara contra la última captura real: si
        // esta nueva viene con MÁS campos en null que la anterior (mismo
        // followers, o sea no es que la cuenta genuinamente perdió datos),
        // se descarta como una captura degradada — se cuenta como fallo y NO
        // se escribe, dejando la última captura buena como "más reciente".
        const previous = await prisma.socialAccountMetricSnapshot.findFirst({
          where: { socialAccountId: account.id },
          orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
          select: { likes: true, comments: true, shares: true, views: true, posts: true },
        });
        if (previous && this.isDegradedCapture(metrics, previous)) {
          failed++;
          this.logger.warn(
            `Captura degradada para cuenta ${account.id} (más campos null que la última buena) — se omite para no borrar el dato anterior`,
          );
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
            posts: metrics.posts,
            audienceGenderAge: metrics.audienceGenderAge ?? undefined,
            audienceCountry: metrics.audienceCountry ?? undefined,
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

    // Mismo criterio que MetricsCronService (auditoría B12): 'failed' solo si
    // ninguna cuenta se procesó de verdad, no ante cualquier fallo parcial.
    const status = failed > 0 && processed === 0 && socialAccounts.length > 0 ? 'failed' : 'completed';
    await prisma.metricSyncRun.update({
      where: { id: syncRun.id },
      data: { finishedAt: new Date(), itemsProcessed: processed, itemsFailed: failed, status },
    });

    this.logger.log(`Snapshots de cuenta: ${processed} ok, ${failed} fallidos de ${socialAccounts.length} cuentas conectadas`);

    return { processed, failed };
  }

  // Cuenta cuántos de los 5 campos "enriquecidos" (no followers, que ya se
  // valida aparte) están en null — una captura nueva con MÁS nulls que la
  // anterior, mismo tipo de cuenta, es casi siempre una falla parcial de la
  // llamada a Ayrshare, no que la cuenta genuinamente perdió sus datos
  // históricos de un momento a otro.
  private isDegradedCapture(
    next: { likes: number | null; comments: number | null; shares: number | null; views: number | null; posts: number | null },
    previous: { likes: number | null; comments: number | null; shares: number | null; views: number | null; posts: number | null },
  ): boolean {
    const countNulls = (m: typeof next) => [m.likes, m.comments, m.shares, m.views, m.posts].filter((v) => v === null).length;
    return countNulls(next) > countNulls(previous);
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
