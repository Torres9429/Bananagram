import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../node_modules/.prisma-client';
import { prisma } from '../prisma/client';
import { getDayOfWeekInTimezone, getHourInTimezone } from '../common/timezone.util';

type LatestMetricRow = {
  postSocialAccountId: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  raw: unknown;
};

// Mismo criterio que posts.service.ts.snippet() (no exportado ahí, se
// duplica el helper trivial en vez de exportarlo entre módulos por esto solo).
function snippet(content: string): string {
  return content.length > 60 ? `${content.slice(0, 60)}…` : content;
}

// Campos específicos de red que NUNCA se normalizaron como columna a
// propósito (docs/backend/auditoria-integracion-ayrshare.md §7: "solo
// Instagram lo expone de forma clara" para saves, inconsistentes entre
// redes) — ya viven en PostMetric.raw desde que se capturan. Se leen aquí
// mismo, sin tocar schema ni mappers, defensivo (raw puede no tener el
// campo — para esa red, o para capturas viejas anteriores a que Ayrshare
// empezara a mandarlo).
// Bug real (2026-08-20): PostMetric.raw guarda la respuesta cruda de
// Ayrshare tal cual (ver ayrshare.service.ts.getAnalytics) — el shape real
// confirmado en vivo anida savedCount/profileVisitsCount/followsCount
// DENTRO de raw.analytics, nunca en la raíz de raw (mismo nivel que
// postUrl/lastUpdated). Esta función solo miraba la raíz, así que
// "Métricas específicas de la red" salía vacía SIEMPRE aunque el dato sí
// estuviera guardado — no era una limitación real de Ayrshare, era leer el
// campo en el lugar equivocado.
function extractRawField(raw: unknown, key: string): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const analytics = root.analytics && typeof root.analytics === 'object' ? (root.analytics as Record<string, unknown>) : null;
  const value = analytics?.[key] ?? root[key];
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && !Number.isNaN(num) ? num : null;
}

// reach primero, views si la red no lo expone (mismo criterio que
// engagement.util.ts) — nunca 0 como denominador si en realidad no hay dato.
// Extraído acá (auditoría B16): estaba reimplementado de forma independiente
// 4 veces en este mismo archivo (getPostMetrics, rankPostsByEngagement,
// buildDailySeries, summarizeNetwork) — mismo cálculo, sin ningún cambio de
// comportamiento al unificarlo.
function computeEngagementRate(interactions: number, reach: number, views: number): number | null {
  const denominator = reach > 0 ? reach : views > 0 ? views : null;
  return denominator ? Math.round((interactions / denominator) * 10000) / 100 : null;
}

type NetworkGroup = {
  networkCode: string;
  networkName: string;
  deliveries: { id: string }[];
};

type TopPost = {
  postId: string;
  network: string;
  date: Date | null;
  // Agregado 2026-08-20: TopContent/ReachEngagementScatter/PostPerformanceChart
  // solo mostraban el nombre de la CAMPAÑA — dos publicaciones de la misma
  // campaña salían con la misma etiqueta, sin forma de distinguir cuál es
  // cuál (pedido explícito del usuario). Recorte corto del caption real.
  contentSnippet: string;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
};

type ContentTypeBreakdown = { type: 'imagen' | 'video' | 'carrusel' | 'sin_media'; count: number };

// Diseño completo en docs/backend/auditoria-integracion-ayrshare.md §22:
// dinámico en cada request (no hay snapshot todavía, no hace falta con el
// volumen actual), última captura por PostSocialAccount vía DISTINCT ON,
// nunca promediar engagementRate entre redes con denominador distinto.
@Injectable()
export class CampaignMetricsService {
  // range: filtro "Desde/Hasta" del dashboard (auditoría B2) — antes este
  // endpoint (a diferencia de getMetricsHistory, que sí acepta rango) siempre
  // devolvía el total acumulado de TODA la campaña sin importar el filtro de
  // periodo activo, así que 9 widgets lo ignoraban en silencio. Acota por
  // `publishedAt` de cada Post — no intenta recomputar un "delta" del
  // acumulado de PostMetric dentro de la ventana (cada captura ya es un
  // total a esa fecha, no un incremento — igual criterio que
  // buildDailySeries), solo restringe QUÉ publicaciones entran al resumen.
  async getCampaignMetrics(campaignId: string, range?: { from?: Date; to?: Date }) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const hasRange = !!(range?.from || range?.to);
    const posts = await prisma.post.findMany({
      where: {
        campaignId,
        deletedAt: null,
        ...(hasRange ? { publishedAt: { gte: range?.from, lte: range?.to } } : {}),
      },
      include: {
        socialAccounts: { include: { socialAccount: { include: { socialNetwork: true } } } },
        media: { include: { media: true } },
      },
    });

    // Bug real (encontrado en vivo): `posts` no filtra por status a propósito
    // arriba (deliveries/topPost/etc. ya se resuelven solos por no tener
    // PostSocialAccount hasta que se publican), pero cualquier conteo que
    // hable de "publicaciones" debe excluir borradores/en revisión/
    // rechazados/cancelados — antes un borrador de prueba nunca enviado a
    // ninguna red se contaba igual que uno real.
    const publishedPosts = posts.filter((post) => post.status === 'publicado' || post.status === 'parcial');

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
      // Solo publicados/parciales (ver publishedPosts arriba) — un borrador
      // nunca enviado no es una "publicación" para efectos de este resumen.
      posts: publishedPosts.length,
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
    const rankedPosts = this.rankPostsByEngagement(deliveries, metricsByDeliveryId, postById);
    const contentTypeBreakdown = this.buildContentTypeBreakdown(publishedPosts);

    return {
      campaignId,
      summary,
      byNetwork,
      topPost: rankedPosts[0] ?? null,
      // Top 5 — el widget "Publicaciones destacadas" del dashboard necesita
      // un ranking, no solo la mejor (topPost, que se mantiene igual para no
      // romper CampaignComparison, que sí solo quiere una).
      topPosts: rankedPosts.slice(0, 5),
      contentTypeBreakdown,
      dataStatus: {
        lastSyncedAt: lastSyncRun?.finishedAt ?? null,
        partial: coveragePercentage < 100,
        missingNetworks,
        coveragePercentage,
      },
    };
  }

  // Métricas de UNA publicación específica, por red — reusa getLatestMetrics
  // (DISTINCT ON, igual que el resto del service) parametrizado por las
  // entregas de este post en particular, en vez de las de toda una campaña.
  // No existía ningún endpoint a este nivel de detalle (solo agregados por
  // campaña/red o el top post) — usado por el widget "Detalle de publicación".
  async getPostMetrics(postId: string): Promise<any> {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: { socialAccounts: { include: { socialAccount: { include: { socialNetwork: true } } } } },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    const latestMetrics = await this.getLatestMetrics(post.socialAccounts.map((d) => d.id));
    const metricsByDeliveryId = new Map(latestMetrics.map((m) => [m.postSocialAccountId, m]));

    const byNetwork = post.socialAccounts.map((delivery) => {
      const metric = metricsByDeliveryId.get(delivery.id);
      const likes = metric?.likes ?? 0;
      const comments = metric?.comments ?? 0;
      const shares = metric?.shares ?? 0;
      const views = metric?.views ?? 0;
      const reach = metric?.reach ?? 0;
      const interactions = likes + comments + shares;
      return {
        networkCode: delivery.socialAccount.socialNetwork.code,
        networkName: delivery.socialAccount.socialNetwork.name,
        status: delivery.status,
        hasMetrics: !!metric,
        likes,
        comments,
        shares,
        views,
        reach,
        interactions,
        engagementRate: computeEngagementRate(interactions, reach, views),
      };
    });

    return {
      postId: post.id,
      campaignId: post.campaignId,
      content: post.content,
      status: post.status,
      publishedAt: post.publishedAt,
      byNetwork,
    };
  }

  // Serie diaria (para EngagementChart/TrendAnalysis) + heatmap de horario
  // de publicación (para PostingHeatMap) — ambos reusan PostMetric, que ya
  // es un log histórico completo (el cron nunca hace update, solo insert);
  // getCampaignMetrics() de arriba descarta ese historial a propósito
  // (DISTINCT ON = solo la última captura). Aquí es al revés: se necesita
  // TODO el historial, agrupado por día.
  async getMetricsHistory(campaignId: string, from?: Date, to?: Date, networkCode?: string) {
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, deletedAt: null } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    const rangeEnd = to ?? new Date();
    const series = await this.buildDailySeries(campaignId, from, rangeEnd, networkCode);
    const heatmap = await this.buildPostingHeatmap(campaignId, networkCode);

    return { campaignId, series, heatmap };
  }

  // Cada fila de PostMetric es un TOTAL acumulado a esa fecha, no un
  // incremento (mismo criterio que getLatestMetrics) — por eso el punto de
  // cada día no es "sumar las capturas de ese día", es "sumar, por cada
  // entrega, su última captura conocida hasta el final de ese día". Se
  // recorre en JS (no otra query $queryRaw por día) porque el volumen de
  // este proyecto no lo justifica — mismo criterio que ya usa
  // getCampaignMetrics para el resto de los cálculos.
  // networkCode agregado 2026-08-20 (bug real reportado en vivo): esta
  // función ignoraba por completo el filtro de red — EngagementChart/
  // TrendAnalysis mostraban la serie de TODA la campaña (todas las redes
  // mezcladas) sin importar qué tab de red estuviera activa, así que una
  // campaña sin ninguna publicación en la red seleccionada igual aparecía
  // con datos (los de sus OTRAS redes). getMetricsHistory ya recibía
  // networkCode del controller y lo usaba para el heatmap, pero nunca lo
  // pasaba para acá.
  private async buildDailySeries(campaignId: string, from: Date | undefined, rangeEnd: Date, networkCode?: string) {
    const rows = await prisma.postMetric.findMany({
      where: {
        postSocialAccount: {
          post: { campaignId, deletedAt: null },
          ...(networkCode ? { socialAccount: { socialNetwork: { code: networkCode } } } : {}),
        },
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
      const engagementRate = computeEngagementRate(interactions, totals.reach, totals.views);

      series.push({ date: day.toISOString().slice(0, 10), ...totals, interactions, engagementRate });
    }

    return series;
  }

  // Interacciones por día-de-semana × hora de publicación — Post.publishedAt
  // ya es un timestamp real con hora (no hacía falta ningún dato nuevo). Usa
  // la ÚLTIMA captura de cada entrega (no la serie diaria) — la pregunta es
  // "qué tan bien funcionan los posts publicados a esta hora", no cómo
  // evolucionó cada uno con el tiempo.
  // networkCode: filtro de la tab de red (Instagram/Facebook/TikTok/X) —
  // antes este heatmap solo existía en General, agregado entre TODAS las
  // redes, así que una campaña publicada solo en 2 de 4 redes conectadas no
  // tenía forma de ver "¿a qué hora funciona mejor ESTA red en particular?".
  private async buildPostingHeatmap(campaignId: string, networkCode?: string) {
    // timezone de la marca dueña de esta campaña (auditoría B18) — antes
    // usaba UTC fijo, mientras score.service.ts usaba hora local del
    // servidor para el mismo concepto ("¿a qué hora se publicó esto?"),
    // criterios inconsistentes dentro del mismo pipeline de métricas.
    const campaign = await prisma.campaign.findFirst({ where: { id: campaignId }, select: { brand: { select: { timezone: true } } } });
    const timezone = campaign?.brand.timezone ?? null;

    const posts = await prisma.post.findMany({
      where: { campaignId, deletedAt: null, publishedAt: { not: null } },
      include: { socialAccounts: { include: { socialAccount: { include: { socialNetwork: true } } } } },
    });

    const deliveries = posts.flatMap((post) =>
      post.socialAccounts
        .filter((delivery) => !networkCode || delivery.socialAccount.socialNetwork.code === networkCode)
        .map((delivery) => ({ id: delivery.id, publishedAt: post.publishedAt! })),
    );
    const latestMetrics = await this.getLatestMetrics(deliveries.map((delivery) => delivery.id));
    const metricsByDeliveryId = new Map(latestMetrics.map((metric) => [metric.postSocialAccountId, metric]));

    const buckets = new Map<string, { dayOfWeek: number; hour: number; interactions: number; posts: number }>();
    for (const delivery of deliveries) {
      const metric = metricsByDeliveryId.get(delivery.id);
      const interactions = (metric?.likes ?? 0) + (metric?.comments ?? 0) + (metric?.shares ?? 0);
      const dayOfWeek = getDayOfWeekInTimezone(delivery.publishedAt, timezone);
      const hour = getHourInTimezone(delivery.publishedAt, timezone);
      const key = `${dayOfWeek}-${hour}`;
      const bucket = buckets.get(key) ?? { dayOfWeek, hour, interactions: 0, posts: 0 };
      bucket.interactions += interactions;
      bucket.posts += 1;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values());
  }

  // Publicaciones individuales de la campaña ordenadas por engagementRate
  // descendente — a diferencia de `byNetwork` (agregado, nunca combina redes
  // con denominador distinto), aquí cada delivery ya es de UNA sola red, así
  // que comparar su propio engagementRate entre deliveries de redes
  // distintas es válido (cada uno normalizado sobre su propio reach/views).
  private rankPostsByEngagement(
    deliveries: Array<{ id: string; postId: string; socialAccount: { socialNetwork: { code: string } } }>,
    metricsByDeliveryId: Map<string, LatestMetricRow>,
    postById: Map<string, { publishedAt: Date | null; content: string }>,
  ): TopPost[] {
    const ranked: TopPost[] = [];
    for (const delivery of deliveries) {
      const metric = metricsByDeliveryId.get(delivery.id);
      if (!metric) continue;

      const interactions = (metric.likes ?? 0) + (metric.comments ?? 0) + (metric.shares ?? 0);
      const engagementRate = computeEngagementRate(interactions, metric.reach ?? 0, metric.views ?? 0);
      if (engagementRate === null) continue;

      const post = postById.get(delivery.postId);
      ranked.push({
        postId: delivery.postId,
        network: delivery.socialAccount.socialNetwork.code,
        date: post?.publishedAt ?? null,
        contentSnippet: snippet(post?.content ?? ''),
        engagementRate,
        likes: metric.likes ?? 0,
        comments: metric.comments ?? 0,
        shares: metric.shares ?? 0,
        views: metric.views ?? 0,
        reach: metric.reach ?? 0,
      });
    }
    return ranked.sort((a, b) => b.engagementRate - a.engagementRate);
  }

  // Tipo de contenido derivado de Media.mimeType (dato propio, nunca de
  // Ayrshare — Post.media ya vive en nuestra BD) — 0 adjuntos = texto solo,
  // 1 = imagen o video según mimeType, 2+ = carrusel (misma clasificación
  // que Instagram usa para mediaProductType, sin depender de que la
  // respuesta de esa red la traiga).
  private buildContentTypeBreakdown(
    posts: Array<{ media: Array<{ media: { mimeType: string } }> }>,
  ): ContentTypeBreakdown[] {
    const counts: Record<ContentTypeBreakdown['type'], number> = { imagen: 0, video: 0, carrusel: 0, sin_media: 0 };
    for (const post of posts) {
      if (post.media.length === 0) {
        counts.sin_media += 1;
      } else if (post.media.length > 1) {
        counts.carrusel += 1;
      } else if (post.media[0].media.mimeType.startsWith('video/')) {
        counts.video += 1;
      } else {
        counts.imagen += 1;
      }
    }
    return (Object.entries(counts) as [ContentTypeBreakdown['type'], number][])
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
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
    const engagementRate = computeEngagementRate(interactions, reach, views);

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
      // Nunca normalizados como columna a propósito (auditoría §7: solo
      // Instagram expone `saves` de forma clara, `profileVisits`/`follows`
      // ninguna red los devuelve consistente) — se leen de PostMetric.raw
      // por request, null si esa red/captura no lo trae.
      saves: this.sumRawField(metrics, 'savedCount'),
      profileVisits: this.sumRawField(metrics, 'profileVisitsCount'),
      follows: this.sumRawField(metrics, 'followsCount'),
    };
  }

  private sum(metrics: LatestMetricRow[], field: 'likes' | 'comments' | 'shares' | 'views' | 'reach'): number {
    return metrics.reduce((total, metric) => total + (metric[field] ?? 0), 0);
  }

  // A diferencia de sum() (siempre suma, 0 si falta): si NINGUNA entrega de
  // la red trae este campo en su raw, el total queda null ("no disponible
  // para esta red"), no 0 ("medido y vale cero") — mismo criterio que el
  // resto del sistema.
  private sumRawField(metrics: LatestMetricRow[], key: string): number | null {
    let total = 0;
    let hasAny = false;
    for (const metric of metrics) {
      const value = extractRawField(metric.raw, key);
      if (value !== null) {
        total += value;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
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
          "postSocialAccountId", likes, comments, shares, views, reach, raw
        FROM post_metrics
        WHERE "postSocialAccountId" IN (${Prisma.join(postSocialAccountIds)})
        ORDER BY "postSocialAccountId", "capturedAt" DESC, "id" DESC
      `,
    );
  }
}
