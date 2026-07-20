// Tipos del dominio de analítica — propios de analytics-front.
// SocialNetworkCode y PostStatus se re-exportan directamente desde @repo/ui/types
// (fuente de verdad, alineada a modelo.txt) en vez de mantener copias locales
// que puedan desincronizarse — ver docs/frontend-db-alignment.md §1.3/§1.5.

export type { SocialNetworkCode, PostStatus } from '@repo/ui/types';

import type { PostStatus, SocialNetworkCode } from '@repo/ui/types';

/**
 * Hecho atómico de métrica: una fila por publicación/red/fecha.
 * Todo agregado (por red, por campaña, por marca) se calcula a partir de esto —
 * nunca se guarda un total precalculado.
 *
 * `impressions` (sin equivalente en `PostMetric` de modelo.txt) se eliminó: en
 * este dominio siempre representó "cuántas veces se vio la publicación", que es
 * exactamente lo que ahora modela `views` (campo real de BD) — mantener ambos
 * habría sido un duplicado sin distinción funcional (ver docs/frontend-db-alignment.md §9.10).
 */
export interface SocialMetricFact {
  id: string;
  networkCode: SocialNetworkCode;
  brandId: string;
  brandName: string;
  socialAccountId: string; // antes brandProfileId — es la cuenta social (red), no la marca
  campaignId: string | null;
  campaignName: string | null;
  postId: string | null;
  postTitle: string | null;
  status: PostStatus;
  publishedAt: string; // ISO date (YYYY-MM-DD)
  reach: number;
  views?: number; // antes `impressions` — renombrado, ver comentario arriba
  likes: number;
  comments: number;
  shares: number;
  followersGained: number;
  engagement: number; // % — antes `engagementRate` (alineado a PostMetric.engagement)
}

export interface AnalyticsKpis {
  totalReach: number;
  totalViews: number; // antes `totalImpressions`
  totalInteractions: number;
  avgEngagement: number; // antes `avgEngagementRate`
  followersGained: number;
  postsCount: number;
}

/**
 * Bolsa de métricas nativas por red (Fase 3) — vive por fuera de SocialMetricFact
 * (que no se modifica) en un lookup separado por factId, ver lib/analytics/network-metrics.ts.
 * Todos los campos son opcionales porque cada red solo puebla los suyos.
 */
export interface NetworkSpecificMetrics {
  // Instagram
  profileVisits?: number;
  saves?: number;
  storyReplies?: number;
  storyExits?: number;
  storyTaps?: number;
  // TikTok / YouTube (tiempo de reproducción)
  watchTimeSeconds?: number;
  avgWatchTimeSeconds?: number;
  completionRate?: number;
  favorites?: number;
  // Facebook
  linkClicks?: number;
  reactions?: number;
  // X
  replies?: number;
  quotes?: number;
  reposts?: number;
  bookmarks?: number;
  // LinkedIn / YouTube
  ctr?: number;
  clicks?: number;
  // YouTube
  avgViewDurationSeconds?: number;
  retention?: number;
}

/** Un valor de KPI ya resuelto y etiquetado, listo para renderizar en NetworkMetricCards. */
export interface NetworkMetricValue {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface CampaignBreakdownEntry {
  campaignId: string;
  campaignName: string;
  kpis: AnalyticsKpis;
}

export interface NetworkAudienceMetrics {
  followersGained: number;
  activeProfiles: number;
  postsCount: number;
}

export interface NetworkDashboardData {
  networkCode: SocialNetworkCode;
  metrics: NetworkMetricValue[];
  campaigns: CampaignBreakdownEntry[];
  topContent: SocialMetricFact[];
  topContentLabel: string;
  audience: NetworkAudienceMetrics;
}

// ── Fase 4: análisis avanzado ────────────────────────────────────────────────

/** Celda de PostingHeatMap. day: 0=domingo..6=sábado (Date.getDay()). hourBucket: 0..7 (bloques de 3h). */
export interface HeatMapCell {
  day: number;
  hourBucket: number;
  value: number;
  postId: string | null;
  networkCode: SocialNetworkCode | null;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'post' | 'campaign';
  label: string;
  networkCode: SocialNetworkCode | null;
  postId: string | null;
  campaignId: string | null;
}

export type InsightSeverity = 'info' | 'success' | 'warning';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
}

/** Subconjunto estructural de BrandScore (@repo/ui) — evita que engine.ts dependa de @repo/ui. */
export interface ScoreSnapshot {
  score: number;
  consistency: number;
  engagement: number;
  frequency: number;
  coverage: number; // informativa — no entra al cálculo ponderado (ver modelo.txt BrandScore)
  classification: string; // string abierto (no enum en BD) — igual que BrandScore.classification en @repo/ui
}

export interface ScoreFactor {
  key: string;
  label: string;
  value: number;
}

export interface ScoreExplanation {
  score: ScoreSnapshot;
  /** Derivados SOLO de consistency/engagement/frequency (los 3 factores que sí ponderan) —
   * `coverage` queda deliberadamente fuera de este arreglo, ver docs/frontend-db-alignment.md §1.4.
   * Se lee directo de `score.coverage` donde haga falta mostrarlo (informativo). */
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
  topNetwork: { networkCode: SocialNetworkCode; engagement: number } | null;
  topCampaign: { campaignId: string; campaignName: string; followersGained: number; sharePercent: number } | null;
  bestPosts: SocialMetricFact[];
  worstPosts: SocialMetricFact[];
}

export interface AudienceOverviewData {
  followersGained: number;
  followersByNetwork: { networkCode: SocialNetworkCode; followersGained: number }[];
  totalInteractions: number;
  postsPerWeek: number;
  avgRetention: number | null;
}

export interface TrendWindow {
  days: number;
  current: AnalyticsKpis;
  previous: AnalyticsKpis;
  direction: 'up' | 'down' | 'flat';
  deltaPercent: number;
  hasData: boolean;
}

export interface CampaignComparisonSide {
  campaignId: string;
  campaignName: string;
  kpis: AnalyticsKpis;
  topPosts: SocialMetricFact[];
}

export interface CampaignComparisonResult {
  campaignA: CampaignComparisonSide | null;
  campaignB: CampaignComparisonSide | null;
}

export interface NetworkComparePoint {
  networkCode: SocialNetworkCode;
  value: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export type DrillLevel = 'global' | 'network' | 'campaign' | 'post';

/**
 * Estado del slice de Redux. Solo filtros, selección y nivel de drill —
 * nunca los datos en sí (esos viven en mock-metrics.ts y se derivan vía selectores).
 *
 * cmName/designerName/category/specialty quedan preparados en el shape (Fase 2,
 * punto 1) pero SIN dato real en SocialMetricFact todavía — el control en
 * AnalyticsFilterBar se muestra deshabilitado hasta que exista esa información.
 */
export interface AnalyticsFiltersState {
  networks: SocialNetworkCode[];
  /** Fase 3: red social como eje principal de navegación (selección única, distinta de `networks[]`). */
  selectedNetwork: SocialNetworkCode | null;
  /** Perfil (antes "marca") en análisis. `SocialMetricFact` conserva `brandId` como nombre de
   * campo heredado del mock — este filtro se resuelve contra ese campo por compatibilidad
   * temporal (ver applyAnalyticsFilters en engine.ts), sin que el dominio expuesto lo sea. */
  profileId: string | null;
  campaignId: string | null;
  postId: string | null;
  status: PostStatus[] | null;
  dateRange: DateRange | null;
  cmName: string | null;
  designerName: string | null;
  category: string | null;
  specialty: string | null;
  drillLevel: DrillLevel;
}
