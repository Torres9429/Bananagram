import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { BrandScore } from '@repo/ui/types';

// Shape real de CampaignMetricsService.getCampaignMetrics (core-service) —
// deliberadamente SIN engagementRate combinado a nivel de resumen (solo por
// red), nunca promediar/combinar tasas con denominadores distintos entre
// redes (ver comentario en el service).
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
}

export interface CampaignMetrics {
  campaignId: string;
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
  dataStatus: {
    lastSyncedAt: string | null;
    partial: boolean;
    missingNetworks: string[];
    coveragePercentage: number;
  };
}

export const metricsApi = createApi({
  reducerPath: 'metricsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['CampaignMetrics', 'BrandScore'],
  endpoints: (builder) => ({
    getCampaignMetrics: builder.query<CampaignMetrics, string>({
      query: (campaignId) => `campaigns/${campaignId}/metrics`,
      providesTags: ['CampaignMetrics'],
    }),
    // Atajo para no esperar el cron automático de cada 6h — fuerza un
    // refresh acotado a esta campaña (MetricsCronService.generateMetrics).
    refreshCampaignMetrics: builder.mutation<CampaignMetrics, string>({
      query: (campaignId) => ({ url: `campaigns/${campaignId}/metrics/refresh`, method: 'POST' }),
      invalidatesTags: ['CampaignMetrics'],
    }),
    // GET brands/:id/score — real desde siempre (ScoreController), pero
    // ClientSection (hero de /profile) nunca lo consumía: mostraba
    // "Aún no disponible" hardcodeado. Mismo endpoint que ya usa
    // analytics-front's ScoreExplanationPanel (useGetBrandScoreQuery de
    // analytics.api.ts) — se duplica el endpoint acá (no el componente)
    // porque las zonas de Multi-Zones no importan código entre sí.
    getBrandScore: builder.query<BrandScore, string>({
      query: (brandId) => `brands/${brandId}/score`,
      providesTags: ['BrandScore'],
    }),
  }),
});

export const { useGetCampaignMetricsQuery, useRefreshCampaignMetricsMutation, useGetBrandScoreQuery } = metricsApi;
