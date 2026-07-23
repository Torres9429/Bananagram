import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { simulateMetrics } from '../metrics/decay-simulator';

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  @Cron('0 */6 * * *') // cada 6 horas
  async generateMetrics() {
    // Capa 2 (PostSocialAccount) es la publicación física por red — las
    // métricas cuelgan de ahí, no de Post directo (ver docs/base/modelo2.txt).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const postSocialAccounts = await prisma.postSocialAccount.findMany({
      where: { status: 'publicado', publishedAt: { gte: sevenDaysAgo } },
      include: { socialAccount: { include: { socialNetwork: true } } },
    });
    for (const psa of postSocialAccounts) {
      const m = simulateMetrics(
        psa.socialAccount.followers,
        psa.socialAccount.socialNetwork.baseEngagementRate / 100,
        psa.publishedAt!,
      );
      await prisma.postMetric.create({ data: { postSocialAccountId: psa.id, ...m } });
    }
    this.logger.log(`Métricas generadas para ${postSocialAccounts.length} publicaciones por red`);
  }
}
