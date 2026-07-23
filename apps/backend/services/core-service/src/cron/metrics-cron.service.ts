import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { prisma } from '../prisma/client';
import { simulateMetrics } from '../metrics/decay-simulator';

@Injectable()
export class MetricsCronService {
  private readonly logger = new Logger(MetricsCronService.name);

  @Cron('0 */6 * * *') // cada 6 horas
  async generateMetrics() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const posts = await prisma.post.findMany({
      where: { status: 'publicado', publishedAt: { gte: sevenDaysAgo }, deletedAt: null },
      include: { brandProfile: { include: { socialNetwork: true } } },
    });
    for (const post of posts) {
      const m = simulateMetrics(
        post.brandProfile.followers,
        post.brandProfile.socialNetwork.baseEngagementRate / 100,
        post.publishedAt!,
      );
      await prisma.postMetric.create({ data: { postId: post.id, brandProfileId: post.brandProfileId, ...m } });
    }
    this.logger.log(`Métricas generadas para ${posts.length} publicaciones`);
  }
}
