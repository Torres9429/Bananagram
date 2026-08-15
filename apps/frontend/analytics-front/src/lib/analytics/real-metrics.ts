import type { CampaignMetricsSummary, CampaignNetworkMetrics } from '../../store/api/analytics.api';

export type ScopedMetrics = {
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  interactions: number;
  engagementRate: number | null;
};

// Suma un conjunto de entradas byNetwork[] en un solo ScopedMetrics —
// factorizado de sumMetrics/totalsByNetwork para reusarlo también cuando
// scopedMetrics necesita sumar un subconjunto de redes (filtro "Red social").
function sumNetworkEntries(entries: CampaignNetworkMetrics[]): ScopedMetrics {
  const totals = entries.reduce(
    (acc, n) => {
      acc.posts += n.posts;
      acc.likes += n.likes;
      acc.comments += n.comments;
      acc.shares += n.shares;
      acc.views += n.views;
      acc.reach += n.reach;
      acc.interactions += n.interactions;
      return acc;
    },
    { posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0, interactions: 0 },
  );
  const engagementRate = totals.reach > 0 ? Math.round((totals.interactions / totals.reach) * 10000) / 100 : null;
  return { ...totals, engagementRate };
}

// Punto único de verdad para "métricas de esta campaña, acotadas a la red
// activa (o al agregado general si no hay ninguna)" — usado por los widgets
// conectados a datos reales, para no repetir esta rama en cada uno.
// El agregado general SÍ combina reach/interacciones entre redes para un
// engagementRate resumen (mismo criterio ya usado en alexa-service/
// campaigns.service.ts, Fase P3) — distinto del criterio de
// campaign-metrics.service.ts (nunca combinar POR red con denominador
// distinto), que aplica dentro de byNetwork, no aquí.
//
// networkCodes: filtro "Red social" (multi-select, solo aplica en General —
// ver useNetworkCodesFilter) — cuando viene con valores, el agregado general
// se recalcula sumando solo esas redes de byNetwork[] en vez de leer
// campaign.summary (que siempre es el total de TODAS las redes).
export function scopedMetrics(campaign: CampaignMetricsSummary, networkCode: string | null, networkCodes?: string[]): ScopedMetrics {
  if (networkCode) {
    const network = campaign.byNetwork.find((n) => n.networkCode === networkCode);
    return network ?? { posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0, interactions: 0, engagementRate: null };
  }
  if (networkCodes && networkCodes.length > 0) {
    return sumNetworkEntries(campaign.byNetwork.filter((n) => networkCodes.includes(n.networkCode)));
  }
  const { posts, likes, comments, shares, views, reach, interactions } = campaign.summary;
  const engagementRate = reach > 0 ? Math.round((interactions / reach) * 10000) / 100 : null;
  return { posts, likes, comments, shares, views, reach, interactions, engagementRate };
}

export function sumMetrics(campaigns: CampaignMetricsSummary[], networkCode: string | null, networkCodes?: string[]): ScopedMetrics {
  const totals = campaigns.reduce(
    (acc, campaign) => {
      const m = scopedMetrics(campaign, networkCode, networkCodes);
      acc.posts += m.posts;
      acc.likes += m.likes;
      acc.comments += m.comments;
      acc.shares += m.shares;
      acc.views += m.views;
      acc.reach += m.reach;
      acc.interactions += m.interactions;
      return acc;
    },
    { posts: 0, likes: 0, comments: 0, shares: 0, views: 0, reach: 0, interactions: 0 },
  );
  const engagementRate = totals.reach > 0 ? Math.round((totals.interactions / totals.reach) * 10000) / 100 : null;
  return { ...totals, engagementRate };
}

export type NetworkTotal = { networkCode: string; networkName: string } & ScopedMetrics;

// Agrega byNetwork[] de todas las campañas en una sola tabla por red — usado
// por NetworkComparison y para resolver "la red que más contribuyó" en
// ScoreExplanationPanel. networkCodes: mismo filtro "Red social" que
// scopedMetrics — cuando viene con valores, las redes fuera de la lista ni
// siquiera aparecen como fila.
export function totalsByNetwork(campaigns: CampaignMetricsSummary[], networkCodes?: string[]): NetworkTotal[] {
  const byCode = new Map<string, NetworkTotal>();
  for (const campaign of campaigns) {
    for (const network of campaign.byNetwork) {
      if (networkCodes && networkCodes.length > 0 && !networkCodes.includes(network.networkCode)) continue;
      const current = byCode.get(network.networkCode) ?? {
        networkCode: network.networkCode,
        networkName: network.networkName,
        posts: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        reach: 0,
        interactions: 0,
        engagementRate: null,
      };
      current.posts += network.posts;
      current.likes += network.likes;
      current.comments += network.comments;
      current.shares += network.shares;
      current.views += network.views;
      current.reach += network.reach;
      current.interactions += network.interactions;
      byCode.set(network.networkCode, current);
    }
  }
  for (const total of byCode.values()) {
    total.engagementRate = total.reach > 0 ? Math.round((total.interactions / total.reach) * 10000) / 100 : null;
  }
  return Array.from(byCode.values());
}

export function bestTopPost(campaigns: CampaignMetricsSummary[]): CampaignMetricsSummary['topPost'] {
  let best: CampaignMetricsSummary['topPost'] = null;
  for (const campaign of campaigns) {
    if (campaign.topPost && (!best || campaign.topPost.engagementRate > best.engagementRate)) {
      best = campaign.topPost;
    }
  }
  return best;
}
