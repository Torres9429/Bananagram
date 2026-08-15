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

type TopPost = { postId: string; network: string; date: Date | null; engagementRate: number };

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

    const postById = new Map(posts.map((post) => [post.id, post]));
    const topPost = this.computeTopPost(deliveries, metricsByDeliveryId, postById);

    return {
      campaignId,
      summary,
      byNetwork,
      topPost,
      dataStatus: {
        lastSyncedAt: lastSyncRun?.finishedAt ?? null,
        partial: coveragePercentage < 100,
        missingNetworks,
        coveragePercentage,
      },
    };
  }

  // Serie diaria (para EngagementChart/TrendAnalysis) + heatmap de horario
  // de publicación (para PostingHeatMap) — ambos reusan PostMetric, que ya
  // es un log histórico completo (el cron nunca hace update, solo insert);
  // getCampaignMetrics() de arriba descarta ese historial a propósito
  // (DISTINCT ON = solo la última captura). Aquí es al revés: se necesita
  // TODO el historial, agrupado por día.
  async getMetricsHistory(campaignId: string, from?: Date, to?: Date) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const rangeEnd = to ?? new Date();
    const series = await this.buildDailySeries(campaignId, from, rangeEnd);
    const heatmap = await this.buildPostingHeatmap(campaignId);

    return { campaignId, series, heatmap };
  }

  // Cada fila de PostMetric es un TOTAL acumulado a esa fecha, no un
  // incremento (mismo criterio que getLatestMetrics) — por eso el punto de
  // cada día no es "sumar las capturas de ese día", es "sumar, por cada
  // entrega, su última captura conocida hasta el final de ese día". Se
  // recorre en JS (no otra query $queryRaw por día) porque el volumen de
  // este proyecto no lo justifica — mismo criterio que ya usa
  // getCampaignMetrics para el resto de los cálculos.
  private async buildDailySeries(campaignId: string, from: Date | undefined, rangeEnd: Date) {
    const rows = await prisma.postMetric.findMany({
      where: {
        postSocialAccount: { post: { campaignId, deletedAt: null } },
        capturedAt: { lte: rangeEnd },
      },
      select: { postSocialAccountId: true, likes: true, comments: true, shares: true, views: true, reach: true, capturedAt: true },
      orderBy: { capturedAt: 'asc' },
    });

    if (rows.length === 0) return [];

    const rangeStart = from ?? rows[0].capturedAt;
    const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
    const end = new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()));

    const latestByDelivery = new Map<string, (typeof rows)[number]>();
    const series: Array<{
      date: string;
      likes: number;
      comments: number;
      shares: number;
      views: number;
      reach: number;
      interactions: number;
      engagementRate: number | null;
    }> = [];

    let rowIndex = 0;
    for (let day = cursor; day <= end; day = new Date(day.getTime() + 86_400_000)) {
      const dayEnd = new Date(day.getTime() + 86_400_000 - 1);
      while (rowIndex < rows.length && rows[rowIndex].capturedAt <= dayEnd) {
        latestByDelivery.set(rows[rowIndex].postSocialAccountId, rows[rowIndex]);
        rowIndex += 1;
      }

      const totals = { likes: 0, comments: 0, shares: 0, views: 0, reach: 0 };
      for (const row of latestByDelivery.values()) {
        totals.likes += row.likes ?? 0;
        totals.comments += row.comments ?? 0;
        totals.shares += row.shares ?? 0;
        totals.views += row.views ?? 0;
        totals.reach += row.reach ?? 0;
      }
      const interactions = totals.likes + totals.comments + totals.shares;
      const denominator = totals.reach > 0 ? totals.reach : totals.views > 0 ? totals.views : null;
      const engagementRate = denominator ? Math.round((interactions / denominator) * 10000) / 100 : null;

      series.push({ date: day.toISOString().slice(0, 10), ...totals, interactions, engagementRate });
    }

    return series;
  }

  // Interacciones por día-de-semana × hora de publicación — Post.publishedAt
  // ya es un timestamp real con hora (no hacía falta ningún dato nuevo). Usa
  // la ÚLTIMA captura de cada entrega (no la serie diaria) — la pregunta es
  // "qué tan bien funcionan los posts publicados a esta hora", no cómo
  // evolucionó cada uno con el tiempo.
  private async buildPostingHeatmap(campaignId: string) {
    const posts = await prisma.post.findMany({
      where: { campaignId, deletedAt: null, publishedAt: { not: null } },
      include: { socialAccounts: true },
    });

    const deliveries = posts.flatMap((post) =>
      post.socialAccounts.map((delivery) => ({ id: delivery.id, publishedAt: post.publishedAt! })),
    );
    const latestMetrics = await this.getLatestMetrics(deliveries.map((delivery) => delivery.id));
    const metricsByDeliveryId = new Map(latestMetrics.map((metric) => [metric.postSocialAccountId, metric]));

    const buckets = new Map<string, { dayOfWeek: number; hour: number; interactions: number; posts: number }>();
    for (const delivery of deliveries) {
      const metric = metricsByDeliveryId.get(delivery.id);
      const interactions = (metric?.likes ?? 0) + (metric?.comments ?? 0) + (metric?.shares ?? 0);
      const dayOfWeek = delivery.publishedAt.getUTCDay();
      const hour = delivery.publishedAt.getUTCHours();
      const key = `${dayOfWeek}-${hour}`;
      const bucket = buckets.get(key) ?? { dayOfWeek, hour, interactions: 0, posts: 0 };
      bucket.interactions += interactions;
      bucket.posts += 1;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values());
  }

  // Mejor publicación individual de la campaña por engagementRate — a
  // diferencia de `byNetwork` (agregado, nunca combina redes con
  // denominador distinto), aquí cada delivery ya es de UNA sola red, así
  // que comparar su propio engagementRate entre deliveries de redes
  // distintas es válido (cada uno normalizado sobre su propio reach/views).
  private computeTopPost(
    deliveries: Array<{ id: string; postId: string; socialAccount: { socialNetwork: { code: string } } }>,
    metricsByDeliveryId: Map<string, LatestMetricRow>,
    postById: Map<string, { publishedAt: Date | null }>,
  ): TopPost | null {
    let best: TopPost | null = null;
    for (const delivery of deliveries) {
      const metric = metricsByDeliveryId.get(delivery.id);
      if (!metric) continue;

      const interactions = (metric.likes ?? 0) + (metric.comments ?? 0) + (metric.shares ?? 0);
      const denominator = (metric.reach ?? 0) > 0 ? metric.reach! : (metric.views ?? 0) > 0 ? metric.views! : null;
      if (!denominator) continue;

      const engagementRate = Math.round((interactions / denominator) * 100 * 100) / 100;
      if (!best || engagementRate > best.engagementRate) {
        best = {
          postId: delivery.postId,
          network: delivery.socialAccount.socialNetwork.code,
          date: postById.get(delivery.postId)?.publishedAt ?? null,
          engagementRate,
        };
      }
    }
    return best;
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
