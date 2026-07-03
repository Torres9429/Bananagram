// Tipos del dominio de analítica — propios de analytics-front.
// Se mantiene el mismo shape de red social/estado que brands-front y posts-front
// (SocialNetworkCode, PostStatus) para narrativa consistente entre microfrontends,
// siguiendo el patrón ya existente de que cada microfrontend mantiene su propia
// copia de tipos/mocks (no hay servicio compartido de datos).

export type SocialNetworkCode = 'IG' | 'TK' | 'LI' | 'FB' | 'X' | 'YT';

export type PostStatus = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'programado' | 'publicado';

/**
 * Hecho atómico de métrica: una fila por publicación/red/fecha.
 * Todo agregado (por red, por campaña, por marca) se calcula a partir de esto —
 * nunca se guarda un total precalculado.
 */
export interface SocialMetricFact {
  id: string;
  networkCode: SocialNetworkCode;
  brandId: string;
  brandName: string;
  brandProfileId: string;
  campaignId: string | null;
  campaignName: string | null;
  postId: string | null;
  postTitle: string | null;
  status: PostStatus;
  publishedAt: string; // ISO date (YYYY-MM-DD)
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  followersGained: number;
  engagementRate: number; // %
}

export interface AnalyticsKpis {
  totalReach: number;
  totalImpressions: number;
  totalInteractions: number;
  avgEngagementRate: number;
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
  coverage: number;
  frequency: number;
  classification: 'bajo' | 'medio' | 'alto';
}

export interface ScoreFactor {
  key: string;
  label: string;
  value: number;
}

export interface ScoreExplanation {
  score: ScoreSnapshot;
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
  topNetwork: { networkCode: SocialNetworkCode; engagementRate: number } | null;
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
