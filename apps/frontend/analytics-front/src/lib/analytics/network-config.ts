import type { SocialNetworkCode } from './types';

// Configuración declarativa por red — datos puros (sin React, sin lógica de negocio).
// engine.ts la consume para construir el dashboard de cada red sin hardcodear nada
// en los componentes: agregar una red nueva es extender estos mapas, no tocar UI.

export interface NetworkDisplayInfo {
  label: string;
  color: string;
  iconKey: 'instagram' | 'tiktok' | 'facebook' | 'x' | 'linkedin' | 'youtube';
}

/** Colores oficiales de marca — mismos valores ya usados en brands-front (AVAILABLE_SOCIAL_NETWORKS). */
export const NETWORK_DISPLAY: Record<SocialNetworkCode, NetworkDisplayInfo> = {
  IG: { label: 'Instagram', color: '#E1306C', iconKey: 'instagram' },
  TK: { label: 'TikTok', color: '#010101', iconKey: 'tiktok' },
  FB: { label: 'Facebook', color: '#1877F2', iconKey: 'facebook' },
  X: { label: 'X', color: '#000000', iconKey: 'x' },
  LI: { label: 'LinkedIn', color: '#0A66C2', iconKey: 'linkedin' },
  YT: { label: 'YouTube', color: '#FF0000', iconKey: 'youtube' },
};

export interface NetworkMetricFieldConfig {
  key: string;
  label: string;
  unit?: string;
}

/**
 * Qué métricas mostrar por red y en qué orden — exactamente las listas pedidas.
 * `key` resuelve contra el objeto combinado (universales + NetworkSpecificMetrics)
 * que arma computeNetworkKPIs() en engine.ts.
 */
export const NETWORK_METRIC_FIELDS: Record<SocialNetworkCode, NetworkMetricFieldConfig[]> = {
  IG: [
    { key: 'reach', label: 'Reach' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'profileVisits', label: 'Profile Visits' },
    { key: 'saves', label: 'Saves' },
    { key: 'storyReplies', label: 'Story Replies' },
    { key: 'storyExits', label: 'Story Exits' },
    { key: 'storyTaps', label: 'Story Taps' },
    { key: 'followers', label: 'Followers' },
  ],
  TK: [
    { key: 'impressions', label: 'Views' },
    { key: 'watchTimeSeconds', label: 'Watch Time', unit: 's' },
    { key: 'avgWatchTimeSeconds', label: 'Average Watch Time', unit: 's' },
    { key: 'completionRate', label: 'Completion Rate', unit: '%' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'shares', label: 'Shares' },
    { key: 'comments', label: 'Comments' },
    { key: 'followers', label: 'Followers' },
  ],
  FB: [
    { key: 'reach', label: 'Reach' },
    { key: 'reactions', label: 'Reactions' },
    { key: 'linkClicks', label: 'Link Clicks' },
    { key: 'followers', label: 'Followers' },
    { key: 'shares', label: 'Shares' },
  ],
  X: [
    { key: 'impressions', label: 'Impressions' },
    { key: 'replies', label: 'Replies' },
    { key: 'quotes', label: 'Quotes' },
    { key: 'reposts', label: 'Reposts' },
    { key: 'bookmarks', label: 'Bookmarks' },
    { key: 'profileVisits', label: 'Profile Visits' },
  ],
  LI: [
    { key: 'impressions', label: 'Impressions' },
    { key: 'ctr', label: 'CTR', unit: '%' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'followers', label: 'Followers' },
    { key: 'reactions', label: 'Reactions' },
  ],
  YT: [
    { key: 'impressions', label: 'Views' },
    { key: 'watchTimeSeconds', label: 'Watch Time', unit: 's' },
    { key: 'avgViewDurationSeconds', label: 'Average View Duration', unit: 's' },
    { key: 'ctr', label: 'CTR', unit: '%' },
    { key: 'retention', label: 'Retention', unit: '%' },
    { key: 'followers', label: 'Subscribers' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Comments' },
  ],
};

/** Métricas que son tasas/promedios (no se suman entre publicaciones, se promedian). */
export const RATE_METRIC_KEYS = new Set(['completionRate', 'avgWatchTimeSeconds', 'ctr', 'retention', 'avgViewDurationSeconds']);

/** Título del widget de mejores publicaciones, propio de cada red (mismo dato vía rankPosts, distinta etiqueta). */
export const NETWORK_TOP_CONTENT_LABEL: Record<SocialNetworkCode, string> = {
  IG: 'Top Reels',
  TK: 'Trending Videos',
  FB: 'Top publicaciones',
  X: 'Top publicaciones',
  LI: 'Top publicaciones',
  YT: 'Top Videos',
};

export interface ComparableMetricOption {
  key: string;
  label: string;
  unit?: string;
  /** Redes que reportan esta métrica — si una red no está aquí, no participa en la comparación (Fase 4). */
  networks: SocialNetworkCode[];
}

/** Catálogo del selector de métrica en NetworkComparison. */
export const COMPARABLE_METRICS: ComparableMetricOption[] = [
  { key: 'engagementRate', label: 'Engagement', unit: '%', networks: ['IG', 'TK', 'FB', 'X', 'LI', 'YT'] },
  { key: 'reach', label: 'Alcance', networks: ['IG', 'FB'] },
  { key: 'impressions', label: 'Views', networks: ['IG', 'TK', 'FB', 'X', 'LI', 'YT'] },
  { key: 'ctr', label: 'CTR', unit: '%', networks: ['LI', 'YT'] },
  { key: 'watchTimeSeconds', label: 'Watch Time', unit: 's', networks: ['TK', 'YT'] },
  { key: 'followers', label: 'Seguidores', networks: ['IG', 'TK', 'FB', 'LI', 'YT'] },
];
