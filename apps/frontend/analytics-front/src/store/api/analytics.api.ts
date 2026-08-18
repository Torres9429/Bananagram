import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// Mismas formas que devuelve core-service (CampaignMetricsService,
// verificado en vivo esta sesión contra Ayrshare real) — deliberadamente sin
// engagementRate combinado a nivel de resumen general, solo por red (nunca
// promediar/combinar tasas con denominador distinto entre redes).
export interface CampaignNetworkMetrics {
  networkCode: string;
  networkName: string;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  interactions: number;
  engagementRate: number | null;
  // Nunca normalizados en BD (auditoría §7 — inconsistentes entre redes,
  // solo Instagram expone saves de forma clara) — leídos de PostMetric.raw
  // por request. null = esta red no lo expone, no "vale 0".
  saves: number | null;
  profileVisits: number | null;
  follows: number | null;
}

export interface CampaignTopPost {
  postId: string;
  network: string;
  date: string | null;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
}

export interface ContentTypeCount {
  type: 'imagen' | 'video' | 'carrusel' | 'sin_media';
  count: number;
}

export interface CampaignMetricsSummary {
  campaignId: string;
  name: string;
  brandId: string;
  summary: {
    posts: number;
    externalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    reach: number;
    interactions: number;
  };
  byNetwork: CampaignNetworkMetrics[];
  topPost: CampaignTopPost | null;
  // Top 5 de la campaña por engagementRate — topPost (arriba) sigue siendo
  // solo el mejor, para no romper CampaignComparison.
  topPosts: CampaignTopPost[];
  contentTypeBreakdown: ContentTypeCount[];
  dataStatus: {
    lastSyncedAt: string | null;
    partial: boolean;
    missingNetworks: string[];
    coveragePercentage: number;
  };
}

export interface BrandScore {
  score: number;
  consistency: number;
  engagement: number;
  coverage: number;
  frequency: number;
  classification: 'bajo' | 'medio' | 'alto';
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface SocialAccount {
  id: string;
  socialNetworkId: string;
  handle: string;
  followers: number;
  active: boolean;
  socialNetwork: { code: string; name: string };
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export interface BrandMetricsHistoryPoint {
  capturedAt: string;
  followers: number;
  // Acumulados de toda la cuenta (todas las publicaciones) — confirmados en
  // vivo contra Ayrshare (Fase Q3). null = no disponible, nunca 0. No existe
  // un campo de "visitas al perfil": Ayrshare no lo expone en este endpoint.
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  // Demografía — confirmado en vivo (shape real: {"F.25-34": 15, ...} /
  // {"US": 161, ...}). null en cuentas con <100 interacciones en 30 días
  // (requisito de Instagram, no de este código).
  audienceGenderAge: Record<string, number> | null;
  audienceCountry: Record<string, number> | null;
  source: string;
  socialAccount: { socialNetwork: { code: string; name: string } };
}

export interface BrandScoreHistoryPoint extends BrandScore {
  snapshotDate: string;
}

export interface CampaignHistoryDay {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  interactions: number;
  engagementRate: number | null;
}

export interface CampaignHeatmapBucket {
  dayOfWeek: number;
  hour: number;
  interactions: number;
  posts: number;
}

export interface CampaignMetricsHistory {
  campaignId: string;
  series: CampaignHistoryDay[];
  heatmap: CampaignHeatmapBucket[];
}

export interface PostNetworkMetrics {
  networkCode: string;
  networkName: string;
  status: string;
  hasMetrics: boolean;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  reach: number;
  interactions: number;
  engagementRate: number | null;
}

export interface PostMetricsDetail {
  postId: string;
  campaignId: string;
  content: string;
  status: string;
  publishedAt: string | null;
  byNetwork: PostNetworkMetrics[];
}

function withRange(path: string, range?: DateRangeParams): string {
  if (!range?.from && !range?.to) return path;
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  return `${path}?${params.toString()}`;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['CampaignsMetricsSummary', 'Brands', 'BrandScore', 'SocialAccounts', 'BrandMetricsHistory', 'BrandScoreHistory', 'CampaignMetricsHistory'],
  endpoints: (builder) => ({
    getCampaignsMetricsSummary: builder.query<CampaignMetricsSummary[], void>({
      query: () => 'campaigns/metrics-summary',
      providesTags: ['CampaignsMetricsSummary'],
    }),
    // Filtrado server-side por pertenencia (BrandsService.listBrands): Admin
    // ve todas, el resto solo las suyas (dueño o por campaña como CM/
    // Diseñador) — mismo endpoint que ya usa brands-front para "Marcas".
    getBrands: builder.query<BrandOption[], void>({
      query: () => 'brands',
      providesTags: ['Brands'],
    }),
    getBrandScore: builder.query<BrandScore, string>({
      query: (brandId) => `brands/${brandId}/score`,
      providesTags: ['BrandScore'],
    }),
    // "Seguidores actuales", no "ganados" — SocialAccount.followers es un
    // contador sin historial (misma limitación ya documentada en Fase P3).
    getBrandSocialAccounts: builder.query<SocialAccount[], string>({
      query: (brandId) => `brands/${brandId}/social-accounts`,
      providesTags: ['SocialAccounts'],
    }),
    // Cliente/Admin únicamente (ScoreController.assertIsBrandOwnerOrAdmin
    // del backend ya lo exige — 403 para CM/Diseñador, esto solo evita la
    // llamada innecesaria desde secciones que no deberían mostrarse).
    getBrandMetricsHistory: builder.query<BrandMetricsHistoryPoint[], { brandId: string; range?: DateRangeParams }>({
      query: ({ brandId, range }) => withRange(`brands/${brandId}/metrics-history`, range),
      providesTags: ['BrandMetricsHistory'],
    }),
    getBrandScoreHistory: builder.query<BrandScoreHistoryPoint[], { brandId: string; range?: DateRangeParams }>({
      query: ({ brandId, range }) => withRange(`brands/${brandId}/score-history`, range),
      providesTags: ['BrandScoreHistory'],
    }),
    getCampaignMetricsHistory: builder.query<CampaignMetricsHistory, { campaignId: string; range?: DateRangeParams }>({
      query: ({ campaignId, range }) => withRange(`campaigns/${campaignId}/metrics-history`, range),
      providesTags: ['CampaignMetricsHistory'],
    }),
    getPostMetrics: builder.query<PostMetricsDetail, { campaignId: string; postId: string }>({
      query: ({ campaignId, postId }) => `campaigns/${campaignId}/posts/${postId}/metrics`,
    }),

    // Refresh al entrar a Métricas (2026-08-17) — dispara una llamada real a
    // Ayrshare del lado del backend (ignora la ventana anti-duplicado de 5h),
    // reusa el endpoint que ya existía para el botón "Actualizar" de brands-
    // front, no se inventó nada nuevo. Invalida los tags de solo-lectura
    // relacionados para que los widgets se refresquen solos al terminar —
    // sin bloquear la pantalla (se dispara en segundo plano, ver metrics/
    // page.tsx). Cuenta social y score comparten el mismo cron
    // (AccountMetricsCronService), por eso un solo refresh invalida ambos.
    refreshBrandMetrics: builder.mutation<BrandMetricsHistoryPoint[], string>({
      query: (brandId) => ({ url: `brands/${brandId}/metrics-history/refresh`, method: 'POST' }),
      invalidatesTags: ['BrandMetricsHistory', 'BrandScoreHistory', 'BrandScore', 'SocialAccounts'],
    }),
    // Acotado a UNA campaña — nunca se dispara en bucle por todas las
    // campañas filtradas (ver metrics/page.tsx, evita N llamadas a Ayrshare
    // por cada entrada a Métricas).
    refreshCampaignMetrics: builder.mutation<unknown, string>({
      query: (campaignId) => ({ url: `campaigns/${campaignId}/metrics/refresh`, method: 'POST' }),
      invalidatesTags: ['CampaignsMetricsSummary', 'CampaignMetricsHistory'],
    }),
  }),
});

export const {
  useGetCampaignsMetricsSummaryQuery,
  useGetBrandsQuery,
  useGetBrandScoreQuery,
  useGetBrandSocialAccountsQuery,
  useGetBrandMetricsHistoryQuery,
  useGetBrandScoreHistoryQuery,
  useGetCampaignMetricsHistoryQuery,
  useGetPostMetricsQuery,
  useRefreshBrandMetricsMutation,
  useRefreshCampaignMetricsMutation,
} = analyticsApi;
