import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../node_modules/.prisma-client';
import { prisma } from '../prisma/client';

type LatestMetricRow = {
  postSocialAccountId: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
};

type NetworkGroup = {
  networkCode: string;
  networkName: string;
  deliveries: { id: string }[];
};

// Diseño completo en docs/backend/auditoria-integracion-ayrshare.md §22:
// dinámico en cada request (no hay snapshot todavía, no hace falta con el
// volumen actual), última captura por PostSocialAccount vía DISTINCT ON,
// nunca promediar engagementRate entre redes con denominador distinto.
@Injectable()
export class CampaignMetricsService {
  async getCampaignMetrics(campaignId: string) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const posts = await prisma.post.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        socialAccounts: { include: { socialAccount: { include: { socialNetwork: true } } } },
      },
    });

    const deliveries = posts.flatMap((post) => post.socialAccounts);
    const latestMetrics = await this.getLatestMetrics(deliveries.map((delivery) => delivery.id));
    const metricsByDeliveryId = new Map(latestMetrics.map((metric) => [metric.postSocialAccountId, metric]));

    const byNetworkGroups = this.groupByNetwork(deliveries);
    const byNetwork = byNetworkGroups.map((group) => this.summarizeNetwork(group, metricsByDeliveryId));

    const successfulDeliveries = deliveries.filter((delivery) => delivery.status === 'publicado').length;
    const failedDeliveries = deliveries.filter((delivery) => delivery.status === 'error').length;

    const summary = {
      // Nombres explícitos y distintos a propósito (auditoría §22.6): un
      // "post" es contenido interno, una "externalDelivery" es su entrega a
      // una red específica — nunca reportar ambos como si fueran lo mismo.
      posts: posts.length,
      externalDeliveries: deliveries.length,
      successfulDeliveries,
      failedDeliveries,
      likes: this.sumField(byNetwork, 'likes'),
      comments: this.sumField(byNetwork, 'comments'),
      shares: this.sumField(byNetwork, 'shares'),
      views: this.sumField(byNetwork, 'views'),
      // Suma de exposiciones, no de audiencia única — la misma persona puede
      // estar en el reach de varios posts (auditoría §22.3).
      reach: this.sumField(byNetwork, 'reach'),
      interactions: this.sumField(byNetwork, 'interactions'),
      // Deliberadamente SIN engagementRate combinado — solo por red
      // (auditoría §22.4/§22.5), nunca promediar/combinar tasas con
      // denominadores distintos entre redes.
    };

    const coveredDeliveries = deliveries.filter((delivery) => metricsByDeliveryId.has(delivery.id)).length;
    const coveragePercentage = deliveries.length > 0 ? Math.round((coveredDeliveries / deliveries.length) * 100) : 0;
    const missingNetworks = byNetworkGroups
      .filter((group) => group.deliveries.some((delivery) => !metricsByDeliveryId.has(delivery.id)))
      .map((group) => group.networkCode);

    const lastSyncRun = await prisma.metricSyncRun.findFirst({
      where: { status: 'completed' },
      orderBy: { finishedAt: 'desc' },
    });

    return {
      campaignId,
      summary,
      byNetwork,
      dataStatus: {
        lastSyncedAt: lastSyncRun?.finishedAt ?? null,
        partial: coveragePercentage < 100,
        missingNetworks,
        coveragePercentage,
      },
    };
  }

  private groupByNetwork(
    deliveries: Array<{ id: string; status: string; socialAccount: { socialNetwork: { code: string; name: string } } }>,
  ): NetworkGroup[] {
    const groups = new Map<string, NetworkGroup>();
    for (const delivery of deliveries) {
      const { code, name } = delivery.socialAccount.socialNetwork;
      if (!groups.has(code)) {
        groups.set(code, { networkCode: code, networkName: name, deliveries: [] });
      }
      groups.get(code)!.deliveries.push({ id: delivery.id });
    }
    return Array.from(groups.values());
  }

  private summarizeNetwork(group: NetworkGroup, metricsByDeliveryId: Map<string, LatestMetricRow>) {
    const metrics = group.deliveries
      .map((delivery) => metricsByDeliveryId.get(delivery.id))
      .filter((metric): metric is LatestMetricRow => !!metric);

    const likes = this.sum(metrics, 'likes');
    const comments = this.sum(metrics, 'comments');
    const shares = this.sum(metrics, 'shares');
    const views = this.sum(metrics, 'views');
    const reach = this.sum(metrics, 'reach');
    const interactions = likes + comments + shares;

    // reach primero, views si la red no lo expone (mismo criterio que
    // engagement.util.ts) — nunca 0 como denominador si en realidad no hay dato.
    const denominator = reach > 0 ? reach : views > 0 ? views : null;
    const engagementRate = denominator ? Math.round((interactions / denominator) * 100 * 100) / 100 : null;

    return {
      networkCode: group.networkCode,
      networkName: group.networkName,
      posts: group.deliveries.length,
      likes,
      comments,
      shares,
      views,
      reach,
      interactions,
      engagementRate,
    };
  }

  private sum(metrics: LatestMetricRow[], field: 'likes' | 'comments' | 'shares' | 'views' | 'reach'): number {
    return metrics.reduce((total, metric) => total + (metric[field] ?? 0), 0);
  }

  private sumField(
    byNetwork: Array<{ likes: number; comments: number; shares: number; views: number; reach: number; interactions: number }>,
    field: 'likes' | 'comments' | 'shares' | 'views' | 'reach' | 'interactions',
  ): number {
    return byNetwork.reduce((total, network) => total + network[field], 0);
  }

  // Última captura por PostSocialAccount — nunca sumar/promediar todo el
  // histórico (cada captura ya es un total acumulado a esa fecha, no un
  // incremento). $queryRaw es el único lugar del proyecto donde se justifica
  // SQL nativo (auditoría §22.9): Prisma no tiene DISTINCT ON nativo.
  private async getLatestMetrics(postSocialAccountIds: string[]): Promise<LatestMetricRow[]> {
    if (postSocialAccountIds.length === 0) return [];
    // Columnas camelCase entre comillas: este schema NO mapea cada campo a
    // snake_case (@@map solo renombra la tabla) — el nombre real de columna
    // es literal "postSocialAccountId"/"capturedAt", no post_social_account_id.
    return prisma.$queryRaw<LatestMetricRow[]>(
      Prisma.sql`
        SELECT DISTINCT ON ("postSocialAccountId")
          "postSocialAccountId", likes, comments, shares, views, reach
        FROM post_metrics
        WHERE "postSocialAccountId" IN (${Prisma.join(postSocialAccountIds)})
        ORDER BY "postSocialAccountId", "capturedAt" DESC
      `,
    );
  }
}
