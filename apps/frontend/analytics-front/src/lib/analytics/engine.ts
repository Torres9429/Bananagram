import type {
  AnalyticsFiltersState,
  AnalyticsKpis,
  AudienceOverviewData,
  CampaignBreakdownEntry,
  CampaignComparisonResult,
  DateRange,
  HeatMapCell,
  Insight,
  NetworkAudienceMetrics,
  NetworkComparePoint,
  NetworkDashboardData,
  NetworkSpecificMetrics,
  ScoreExplanation,
  ScoreSnapshot,
  SocialMetricFact,
  SocialNetworkCode,
  TimelineEvent,
  TrendWindow,
} from './types';
import { NETWORK_METRIC_FIELDS, NETWORK_TOP_CONTENT_LABEL, RATE_METRIC_KEYS } from './network-config';

// Analytics Engine — toda la lógica de negocio de métricas vive aquí, como funciones
// puras (sin React, sin Redux). Las vistas y los selectores solo la invocan.

export function applyAnalyticsFilters(facts: SocialMetricFact[], filters: AnalyticsFiltersState): SocialMetricFact[] {
  let result = facts;

  if (filters.profileId) {
    // `f.brandId` es el nombre de campo heredado del mock (SocialMetricFact) — el
    // filtro ya se expone como `profileId` en el dominio (ver types.ts).
    result = result.filter((f) => f.brandId === filters.profileId);
  }
  if (filters.networks.length > 0) {
    result = result.filter((f) => filters.networks.includes(f.networkCode));
  }
  if (filters.campaignId) {
    result = result.filter((f) => f.campaignId === filters.campaignId);
  }
  if (filters.selectedNetwork) {
    result = result.filter((f) => f.networkCode === filters.selectedNetwork);
  }
  if (filters.postId) {
    result = result.filter((f) => f.postId === filters.postId);
  }
  if (filters.status && filters.status.length > 0) {
    result = result.filter((f) => filters.status!.includes(f.status));
  }
  if (filters.dateRange) {
    result = filterByDateRange(result, filters.dateRange);
  }

  return result;
}

export function filterByDateRange(facts: SocialMetricFact[], range: DateRange): SocialMetricFact[] {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  return facts.filter((f) => {
    const t = new Date(f.publishedAt).getTime();
    return t >= start && t <= end;
  });
}

export function computeKpis(facts: SocialMetricFact[]): AnalyticsKpis {
  if (facts.length === 0) {
    return { totalReach: 0, totalImpressions: 0, totalInteractions: 0, avgEngagementRate: 0, followersGained: 0, postsCount: 0 };
  }

  const totalReach = sumBy(facts, (f) => f.reach);
  const totalImpressions = sumBy(facts, (f) => f.impressions);
  const totalInteractions = sumBy(facts, (f) => f.likes + f.comments + f.shares);
  const followersGained = sumBy(facts, (f) => f.followersGained);
  const avgEngagementRate = round1(sumBy(facts, (f) => f.engagementRate) / facts.length);
  const postsCount = new Set(facts.filter((f) => f.postId).map((f) => f.postId)).size;

  return { totalReach, totalImpressions, totalInteractions, avgEngagementRate, followersGained, postsCount };
}

export interface KpiComparison {
  current: AnalyticsKpis;
  previous: AnalyticsKpis;
  deltas: Record<keyof AnalyticsKpis, number>;
}

/** Compara KPIs entre dos rangos de fecha sobre el mismo conjunto ya filtrado por otros ejes (marca/red/campaña). */
export function compareKpiPeriods(facts: SocialMetricFact[], currentRange: DateRange, previousRange: DateRange): KpiComparison {
  const current = computeKpis(filterByDateRange(facts, currentRange));
  const previous = computeKpis(filterByDateRange(facts, previousRange));

  const deltas = Object.keys(current).reduce((acc, key) => {
    const k = key as keyof AnalyticsKpis;
    acc[k] = percentChange(previous[k], current[k]);
    return acc;
  }, {} as Record<keyof AnalyticsKpis, number>);

  return { current, previous, deltas };
}

export function groupByNetwork(facts: SocialMetricFact[]): Partial<Record<SocialNetworkCode, SocialMetricFact[]>> {
  return groupBy(facts, (f) => f.networkCode);
}

export function groupByCampaign(facts: SocialMetricFact[]): Record<string, SocialMetricFact[]> {
  const withCampaign = facts.filter((f): f is SocialMetricFact & { campaignId: string } => f.campaignId !== null);
  return groupBy(withCampaign, (f) => f.campaignId);
}

export type RankCriterion = 'reach' | 'engagementRate' | 'likes' | 'comments' | 'shares';

/** direction='asc' agregado en Fase 4 (default 'desc', mismo comportamiento de siempre para los llamadores existentes). */
export function rankPosts(
  facts: SocialMetricFact[],
  criterion: RankCriterion,
  limit = 5,
  direction: 'desc' | 'asc' = 'desc',
): SocialMetricFact[] {
  return [...facts]
    .filter((f) => f.postId !== null)
    .sort((a, b) => (direction === 'desc' ? b[criterion] - a[criterion] : a[criterion] - b[criterion]))
    .slice(0, limit);
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export function prepareTimeSeries(facts: SocialMetricFact[], metric: RankCriterion): TimeSeriesPoint[] {
  const byDate = groupBy(facts, (f) => f.publishedAt);
  return Object.entries(byDate)
    .map(([date, items]) => ({ date, value: round1(sumBy(items, (f) => f[metric]) / items.length) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface ProfileOption {
  id: string;
  name: string;
}

export interface CampaignOption {
  id: string;
  name: string;
}

export interface NetworkReachPoint {
  networkCode: SocialNetworkCode;
  reach: number;
}

/** Perfiles presentes en el dataset (para poblar el filtro de Perfil). Sin dependencia de filtros activos. */
export function listProfileOptions(facts: SocialMetricFact[]): ProfileOption[] {
  const byId = new Map<string, string>();
  for (const f of facts) byId.set(f.brandId, f.brandName);
  return Array.from(byId, ([id, name]) => ({ id, name }));
}

/** Redes presentes en el dataset (para poblar el filtro de Red social). */
export function listNetworkOptions(facts: SocialMetricFact[]): SocialNetworkCode[] {
  return Array.from(new Set(facts.map((f) => f.networkCode)));
}

/** Campañas disponibles, opcionalmente acotadas a un perfil (dropdown dependiente). */
export function listCampaignOptions(facts: SocialMetricFact[], profileId: string | null): CampaignOption[] {
  const scoped = profileId ? facts.filter((f) => f.brandId === profileId) : facts;
  const byId = new Map<string, string>();
  for (const f of scoped) {
    if (f.campaignId && f.campaignName) byId.set(f.campaignId, f.campaignName);
  }
  return Array.from(byId, ([id, name]) => ({ id, name }));
}

/** Alcance total agrupado por red — alimenta la gráfica "Comparativa de alcance por red social". */
export function reachByNetwork(facts: SocialMetricFact[]): NetworkReachPoint[] {
  const grouped = groupByNetwork(facts);
  return Object.entries(grouped).map(([networkCode, items]) => ({
    networkCode: networkCode as SocialNetworkCode,
    reach: sumBy(items ?? [], (f) => f.reach),
  }));
}

// ── Fase 3: Dashboard orientado por red social ──────────────────────────────
// groupMetricsByNetwork() y computeTopContent() no se reimplementan aquí:
// se reutilizan groupByNetwork() y rankPosts() (ambas ya existentes, arriba).

/**
 * KPIs de una red, combinando los campos universales de SocialMetricFact con las
 * métricas nativas de esa red (bolsa NetworkSpecificMetrics, ver network-metrics.ts).
 * `facts` debe venir ya acotado a la red en cuestión (lo hace applyAnalyticsFilters
 * vía filters.selectedNetwork) — esta función no vuelve a filtrar por red.
 */
export function computeNetworkKPIs(
  facts: SocialMetricFact[],
  specificByFactId: Record<string, NetworkSpecificMetrics>,
): Record<string, number> {
  const universal: Record<string, number> = {
    reach: sumBy(facts, (f) => f.reach),
    impressions: sumBy(facts, (f) => f.impressions),
    likes: sumBy(facts, (f) => f.likes),
    comments: sumBy(facts, (f) => f.comments),
    shares: sumBy(facts, (f) => f.shares),
    followers: sumBy(facts, (f) => f.followersGained),
    engagementRate: facts.length > 0 ? round1(sumBy(facts, (f) => f.engagementRate) / facts.length) : 0,
  };

  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const f of facts) {
    const specific = specificByFactId[f.id];
    if (!specific) continue;
    for (const [key, value] of Object.entries(specific)) {
      if (value === undefined) continue;
      sums[key] = (sums[key] ?? 0) + value;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  const resolved: Record<string, number> = {};
  for (const key of Object.keys(sums)) {
    resolved[key] = RATE_METRIC_KEYS.has(key) ? round1(sums[key] / counts[key]) : sums[key];
  }

  return { ...universal, ...resolved };
}

/** Rendimiento por campaña — reutiliza groupByCampaign + computeKpis, ordenado por alcance. */
export function computeCampaignBreakdown(facts: SocialMetricFact[]): CampaignBreakdownEntry[] {
  const grouped = groupByCampaign(facts);
  return Object.entries(grouped)
    .map(([campaignId, items]) => ({
      campaignId,
      campaignName: items[0]?.campaignName ?? campaignId,
      kpis: computeKpis(items),
    }))
    .sort((a, b) => b.kpis.totalReach - a.kpis.totalReach);
}

/** Métricas de audiencia — crecimiento de seguidores y cobertura de perfiles/publicaciones. */
export function computeAudienceMetrics(facts: SocialMetricFact[]): NetworkAudienceMetrics {
  return {
    followersGained: sumBy(facts, (f) => f.followersGained),
    activeProfiles: new Set(facts.map((f) => f.brandProfileId)).size,
    postsCount: new Set(facts.filter((f) => f.postId).map((f) => f.postId)).size,
  };
}

/**
 * Bundle completo para el dashboard de una red — compone las funciones puras de
 * arriba en un solo objeto que los componentes solo renderizan (no calculan).
 * `facts` ya debe venir acotado a la red (mismo criterio que computeNetworkKPIs).
 */
export function buildNetworkDashboard(
  facts: SocialMetricFact[],
  networkCode: SocialNetworkCode,
  specificByFactId: Record<string, NetworkSpecificMetrics>,
): NetworkDashboardData {
  const kpiValues = computeNetworkKPIs(facts, specificByFactId);
  const fields = NETWORK_METRIC_FIELDS[networkCode];

  return {
    networkCode,
    metrics: fields.map((field) => ({ key: field.key, label: field.label, unit: field.unit, value: kpiValues[field.key] ?? 0 })),
    campaigns: computeCampaignBreakdown(facts),
    topContent: rankPosts(facts, 'engagementRate', 5),
    topContentLabel: NETWORK_TOP_CONTENT_LABEL[networkCode],
    audience: computeAudienceMetrics(facts),
  };
}

/**
 * Decide qué secciones del dashboard de red tienen sentido mostrar, según si hay
 * datos — así nunca se renderiza una tarjeta/sección vacía.
 */
export function buildNetworkWidgets(facts: SocialMetricFact[]): string[] {
  const widgets: string[] = ['overview', 'metrics'];
  if (facts.some((f) => f.postId)) widgets.push('topContent');
  if (Object.keys(groupByCampaign(facts)).length > 0) widgets.push('campaigns');
  return widgets;
}

// ── Fase 4: análisis avanzado ────────────────────────────────────────────────

const HOUR_BUCKET_SIZE = 3; // 24h / 3h = 8 columnas en el heatmap

/** Día×hora con mayor interacción — celdas vacías se omiten (nunca se inventa actividad). */
export function computeHeatMap(facts: SocialMetricFact[], hourByFactId: Record<string, number>): HeatMapCell[] {
  const cells = new Map<string, HeatMapCell>();
  for (const f of facts) {
    const hour = hourByFactId[f.id];
    if (hour === undefined) continue;
    const day = new Date(f.publishedAt).getDay();
    const hourBucket = Math.floor(hour / HOUR_BUCKET_SIZE);
    const key = `${day}-${hourBucket}`;
    const existing = cells.get(key);
    const interactions = f.likes + f.comments + f.shares;
    if (existing) {
      existing.value += interactions;
    } else {
      cells.set(key, { day, hourBucket, value: interactions, postId: f.postId, networkCode: f.networkCode });
    }
  }
  return Array.from(cells.values());
}

/** Línea de tiempo de publicaciones + inicio de campañas — ordenada cronológicamente. */
export function buildTimeline(facts: SocialMetricFact[]): TimelineEvent[] {
  const postEvents: TimelineEvent[] = facts
    .filter((f) => f.postId)
    .map((f) => ({
      id: `post-${f.id}`,
      date: f.publishedAt,
      type: 'post',
      label: f.postTitle ?? 'Publicación',
      networkCode: f.networkCode,
      postId: f.postId,
      campaignId: f.campaignId,
    }));

  const campaignStarts = Object.entries(groupByCampaign(facts)).map(([campaignId, items]) => {
    const first = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))[0];
    return {
      id: `campaign-${campaignId}`,
      date: first.publishedAt,
      type: 'campaign' as const,
      label: `Inicio de campaña: ${first.campaignName ?? campaignId}`,
      networkCode: null,
      postId: null,
      campaignId,
    };
  });

  return [...postEvents, ...campaignStarts].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Insights deterministas — reglas simples sobre datos ya calculados por otras
 * funciones del engine (sin IA, sin fórmulas nuevas). Compone computeHeatMap,
 * groupByNetwork/computeKpis y groupByCampaign; no repite lógica de agregación.
 */
export function computeInsights(facts: SocialMetricFact[], hourByFactId: Record<string, number>): Insight[] {
  const insights: Insight[] = [];
  const byNetwork = groupByNetwork(facts);
  const networkKpis = Object.entries(byNetwork).map(([code, items]) => ({
    networkCode: code as SocialNetworkCode,
    kpis: computeKpis(items ?? []),
  }));

  if (networkKpis.length > 0) {
    const best = [...networkKpis].sort((a, b) => b.kpis.avgEngagementRate - a.kpis.avgEngagementRate)[0];
    insights.push({
      id: 'best-engagement-network',
      severity: 'success',
      title: `${best.networkCode} tiene el mayor engagement`,
      description: `${best.kpis.avgEngagementRate}% de engagement promedio en el periodo analizado.`,
    });
  }

  for (const { networkCode, kpis } of networkKpis) {
    const previous = computeKpis(byNetwork[networkCode]?.filter((f) => f.publishedAt < CURRENT_WEEK_START) ?? []);
    const current = computeKpis(byNetwork[networkCode]?.filter((f) => f.publishedAt >= CURRENT_WEEK_START) ?? []);
    if (previous.totalReach === 0 || current.totalReach === 0) continue;
    const delta = percentChange(previous.totalReach, current.totalReach);
    if (delta <= -10) {
      insights.push({
        id: `reach-drop-${networkCode}`,
        severity: 'warning',
        title: `${networkCode} perdió alcance esta semana`,
        description: `El alcance bajó ${Math.abs(delta)}% respecto a la semana anterior.`,
      });
    } else if (delta >= 10) {
      insights.push({
        id: `reach-growth-${networkCode}`,
        severity: 'success',
        title: `${networkCode} aumentó su alcance esta semana`,
        description: `El alcance subió ${delta}% respecto a la semana anterior.`,
      });
    }
  }

  const campaigns = computeCampaignBreakdown(facts);
  const totalFollowersGained = sumBy(campaigns, (c) => c.kpis.followersGained);
  if (campaigns.length > 0 && totalFollowersGained > 0) {
    const top = campaigns.reduce((a, b) => (b.kpis.followersGained > a.kpis.followersGained ? b : a));
    const share = round1((top.kpis.followersGained / totalFollowersGained) * 100);
    if (share >= 20) {
      insights.push({
        id: `top-campaign-${top.campaignId}`,
        severity: 'info',
        title: `La campaña ${top.campaignName} lidera el crecimiento`,
        description: `Generó el ${share}% del crecimiento total de seguidores del periodo.`,
      });
    }
  }

  const heatmap = computeHeatMap(facts, hourByFactId);
  if (heatmap.length > 0) {
    const byDay = groupBy(heatmap, (c) => String(c.day));
    const bestDay = Object.entries(byDay)
      .map(([day, cells]) => ({ day: Number(day), total: sumBy(cells, (c) => c.value) }))
      .sort((a, b) => b.total - a.total)[0];
    insights.push({
      id: 'best-posting-day',
      severity: 'info',
      title: `${WEEKDAY_LABELS[bestDay.day]} es el día con más interacción`,
      description: 'Considera concentrar publicaciones importantes ese día.',
    });
  }

  return insights;
}

export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const HOUR_BUCKET_LABELS = ['00-02', '03-05', '06-08', '09-11', '12-14', '15-17', '18-20', '21-23'];
// Fase 4 usa el mismo límite de semana que mock-metrics.ts (CURRENT_RANGE.start) para
// distinguir "esta semana" de "la anterior" sin importar mock-metrics.ts (evita ciclo).
const CURRENT_WEEK_START = '2026-06-22';

/**
 * Explica (no recalcula) el Score existente: decompone sus 4 componentes en
 * factores positivos/negativos (umbral 70/60) y señala qué red/campaña/posts
 * más influyeron — usando SIEMPRE datos ya calculados por otras funciones del engine.
 */
export function buildScoreExplanation(score: ScoreSnapshot, facts: SocialMetricFact[]): ScoreExplanation {
  const components: { key: 'consistency' | 'engagement' | 'coverage' | 'frequency'; label: string }[] = [
    { key: 'consistency', label: 'Consistencia' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'coverage', label: 'Cobertura' },
    { key: 'frequency', label: 'Frecuencia' },
  ];
  const positiveFactors = components.filter((c) => score[c.key] >= 70).map((c) => ({ key: c.key, label: c.label, value: score[c.key] }));
  const negativeFactors = components.filter((c) => score[c.key] < 60).map((c) => ({ key: c.key, label: c.label, value: score[c.key] }));

  const byNetwork = groupByNetwork(facts);
  const networkKpis = Object.entries(byNetwork).map(([code, items]) => ({
    networkCode: code as SocialNetworkCode,
    kpis: computeKpis(items ?? []),
  }));
  const topNetwork =
    networkKpis.length > 0
      ? networkKpis.reduce((a, b) => (b.kpis.avgEngagementRate > a.kpis.avgEngagementRate ? b : a))
      : null;

  const campaigns = computeCampaignBreakdown(facts);
  const totalFollowersGained = sumBy(campaigns, (c) => c.kpis.followersGained);
  const topCampaignEntry = campaigns.length > 0 ? campaigns.reduce((a, b) => (b.kpis.followersGained > a.kpis.followersGained ? b : a)) : null;

  return {
    score,
    positiveFactors,
    negativeFactors,
    topNetwork: topNetwork ? { networkCode: topNetwork.networkCode, engagementRate: topNetwork.kpis.avgEngagementRate } : null,
    topCampaign: topCampaignEntry
      ? {
          campaignId: topCampaignEntry.campaignId,
          campaignName: topCampaignEntry.campaignName,
          followersGained: topCampaignEntry.kpis.followersGained,
          sharePercent: totalFollowersGained > 0 ? round1((topCampaignEntry.kpis.followersGained / totalFollowersGained) * 100) : 0,
        }
      : null,
    bestPosts: rankPosts(facts, 'engagementRate', 3, 'desc'),
    worstPosts: rankPosts(facts, 'engagementRate', 3, 'asc'),
  };
}

/** Visión de audiencia — reutiliza computeAudienceMetrics + groupByNetwork, sin recalcular sumas propias. */
export function computeAudienceOverview(
  facts: SocialMetricFact[],
  specificByFactId: Record<string, NetworkSpecificMetrics>,
): AudienceOverviewData {
  const audience = computeAudienceMetrics(facts);
  const byNetwork = groupByNetwork(facts);
  const followersByNetwork = Object.entries(byNetwork).map(([code, items]) => ({
    networkCode: code as SocialNetworkCode,
    followersGained: sumBy(items ?? [], (f) => f.followersGained),
  }));

  const retentionValues: number[] = [];
  for (const f of facts) {
    const retention = specificByFactId[f.id]?.retention;
    if (retention !== undefined) retentionValues.push(retention);
  }

  return {
    followersGained: audience.followersGained,
    followersByNetwork,
    totalInteractions: sumBy(facts, (f) => f.likes + f.comments + f.shares),
    postsPerWeek: round1(audience.postsCount / 2), // el dataset cubre ~2 semanas
    avgRetention: retentionValues.length > 0 ? round1(sumBy(retentionValues, (v) => v) / retentionValues.length) : null,
  };
}

/**
 * Compara la ventana actual contra la anterior de igual tamaño, para 7/30/90 días.
 * Generaliza compareKpiPeriods (Fase 1) a tamaño de ventana variable. Si no hay
 * datos suficientes para una ventana, hasData=false — nunca se inventa tendencia.
 */
export function computeTrendAnalysis(facts: SocialMetricFact[], referenceDateIso: string, windowsDays: number[]): TrendWindow[] {
  const reference = new Date(referenceDateIso).getTime();
  const DAY_MS = 86_400_000;

  return windowsDays.map((days) => {
    const currentRange: DateRange = {
      start: new Date(reference - days * DAY_MS).toISOString().slice(0, 10),
      end: referenceDateIso,
    };
    const previousRange: DateRange = {
      start: new Date(reference - days * 2 * DAY_MS).toISOString().slice(0, 10),
      end: new Date(reference - days * DAY_MS).toISOString().slice(0, 10),
    };
    const current = computeKpis(filterByDateRange(facts, currentRange));
    const previous = computeKpis(filterByDateRange(facts, previousRange));
    const hasData = current.postsCount > 0 || previous.postsCount > 0;
    const deltaPercent = hasData ? percentChange(previous.avgEngagementRate, current.avgEngagementRate) : 0;

    return {
      days,
      current,
      previous,
      direction: deltaPercent > 1 ? 'up' : deltaPercent < -1 ? 'down' : 'flat',
      deltaPercent,
      hasData,
    };
  });
}

/** Compara dos campañas lado a lado — reutiliza computeKpis + rankPosts, sin fórmula nueva. */
export function compareCampaigns(facts: SocialMetricFact[], campaignIdA: string | null, campaignIdB: string | null): CampaignComparisonResult {
  function buildSide(campaignId: string | null) {
    if (!campaignId) return null;
    const items = facts.filter((f) => f.campaignId === campaignId);
    if (items.length === 0) return null;
    return {
      campaignId,
      campaignName: items[0].campaignName ?? campaignId,
      kpis: computeKpis(items),
      topPosts: rankPosts(items, 'engagementRate', 3, 'desc'),
    };
  }

  return { campaignA: buildSide(campaignIdA), campaignB: buildSide(campaignIdB) };
}

/** Compara una métrica entre redes — omite las redes que no la reportan (nunca "0" fantasma). */
export function compareNetworks(
  facts: SocialMetricFact[],
  metricKey: string,
  supportedNetworks: SocialNetworkCode[],
  specificByFactId: Record<string, NetworkSpecificMetrics>,
): NetworkComparePoint[] {
  const grouped = groupByNetwork(facts);
  return supportedNetworks
    .filter((code) => grouped[code] && grouped[code]!.length > 0)
    .map((code) => ({
      networkCode: code,
      value: computeNetworkKPIs(grouped[code]!, specificByFactId)[metricKey] ?? 0,
    }));
}

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function percentChange(previous: number, current: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round1(((current - previous) / previous) * 100);
}

function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
