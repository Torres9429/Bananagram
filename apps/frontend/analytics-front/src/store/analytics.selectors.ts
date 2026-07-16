import { createSelector } from '@reduxjs/toolkit';
import {
  applyAnalyticsFilters,
  buildNetworkDashboard,
  buildNetworkWidgets,
  buildScoreExplanation,
  buildTimeline,
  compareKpiPeriods,
  computeAudienceOverview,
  computeCampaignBreakdown,
  computeHeatMap,
  computeInsights,
  computeKpis,
  computeTrendAnalysis,
  groupByNetwork,
  listProfileOptions,
  listCampaignOptions,
  listNetworkOptions,
  prepareTimeSeries,
  rankPosts,
  reachByNetwork,
} from '../lib/analytics/engine';
import {
  CURRENT_RANGE,
  MOCK_METRIC_FACTS,
  PREVIOUS_RANGE,
  MOCK_NETWORK_SPECIFIC_METRICS,
  SUPPLEMENTAL_METRIC_FACTS,
  MOCK_PUBLISHED_HOUR,
  MOCK_BRAND_METRICS,
} from '../lib/mock-data';
import type { RootState } from '../interfaces/interface';

// Único punto de verdad: cualquier widget que necesite datos de analítica
// pasa por estos selectores — nunca vuelve a filtrar/agregar por su cuenta.

// Fase 3: se combinan los facts de Fase 1 (mock-metrics.ts, sin modificar) con los
// hechos adicionales de X (network-metrics.ts) — mismo dataset, capa aditiva.
const ALL_METRIC_FACTS = [...MOCK_METRIC_FACTS, ...SUPPLEMENTAL_METRIC_FACTS];

const selectAllMetricFacts = () => ALL_METRIC_FACTS;

export const selectAnalyticsFilters = (state: RootState) => state.analyticsFilters;

export const selectFilteredMetricFacts = createSelector(
  [selectAllMetricFacts, selectAnalyticsFilters],
  applyAnalyticsFilters,
);

export const selectAnalyticsKpis = createSelector([selectFilteredMetricFacts], computeKpis);

/** KPIs del período actual vs. el período anterior, sobre el mismo scope de marca/red/campaña. */
export const selectAnalyticsKpiComparison = createSelector([selectFilteredMetricFacts], (facts) =>
  compareKpiPeriods(facts, CURRENT_RANGE, PREVIOUS_RANGE),
);

// ── Opciones para los controles de AnalyticsFilterBar ──────────────────────
// Derivadas del dataset completo (no del ya filtrado) para que un filtro no
// oculte sus propias opciones — mismo criterio que dashboard-header.tsx del
// Dashboard drill (products/states se leen de mockSalesData completo).

export const selectProfileOptions = createSelector([selectAllMetricFacts], listProfileOptions);

export const selectNetworkOptions = createSelector([selectAllMetricFacts], listNetworkOptions);

/** Dropdown dependiente: las campañas se acotan al perfil seleccionado (si hay uno). */
export const selectCampaignOptions = createSelector(
  [selectAllMetricFacts, (state: RootState) => state.analyticsFilters.profileId],
  listCampaignOptions,
);

/** Nombre de la campaña seleccionada (para el breadcrumb) — mismo criterio que selectSelectedPostLabel. */
export const selectSelectedCampaignLabel = createSelector(
  [selectAllMetricFacts, selectAnalyticsFilters],
  (facts, filters) => (filters.campaignId ? (facts.find((f) => f.campaignId === filters.campaignId)?.campaignName ?? filters.campaignId) : null),
);

/** Título de la publicación seleccionada (para mostrar en el chip de filtro activo). */
export const selectSelectedPostLabel = createSelector(
  [selectAllMetricFacts, selectAnalyticsFilters],
  (facts, filters) => (filters.postId ? (facts.find((f) => f.postId === filters.postId)?.postTitle ?? filters.postId) : null),
);

export const selectActiveFiltersCount = createSelector([selectAnalyticsFilters], (filters) => {
  let count = 0;
  if (filters.profileId) count += 1;
  if (filters.networks.length > 0) count += 1;
  if (filters.selectedNetwork) count += 1;
  if (filters.campaignId) count += 1;
  if (filters.postId) count += 1;
  if (filters.status && filters.status.length > 0) count += 1;
  if (filters.dateRange) count += 1;
  return count;
});

// ── Fase 3: dashboard orientado por red social ─────────────────────────────

export const selectSelectedNetwork = (state: RootState) => state.analyticsFilters.selectedNetwork;

/**
 * Facts para SocialNetworkTabs: mismo scope que selectFilteredMetricFacts (marca,
 * campaña, publicación, estado, período) pero SIN acotar por red — así las 6
 * pestañas pueden mostrar su propio conteo simultáneamente.
 */
export const selectFactsForNetworkTabs = createSelector([selectAllMetricFacts, selectAnalyticsFilters], (facts, filters) =>
  applyAnalyticsFilters(facts, { ...filters, selectedNetwork: null, networks: [] }),
);

/** KPIs resumidos por red — reutiliza groupByNetwork + computeKpis (Fase 1), sin lógica nueva. */
export const selectNetworkTabsSummary = createSelector([selectFactsForNetworkTabs], (facts) => {
  const grouped = groupByNetwork(facts);
  return Object.fromEntries(Object.entries(grouped).map(([code, items]) => [code, computeKpis(items ?? [])]));
});

/** Bundle completo del dashboard de la red seleccionada — null si no hay red activa. */
export const selectNetworkDashboard = createSelector(
  [selectFilteredMetricFacts, selectSelectedNetwork],
  (facts, networkCode) => (networkCode ? buildNetworkDashboard(facts, networkCode, MOCK_NETWORK_SPECIFIC_METRICS) : null),
);

/** Qué secciones renderizar para la red seleccionada (nunca tarjetas vacías). */
export const selectNetworkWidgetKeys = createSelector([selectFilteredMetricFacts, selectSelectedNetwork], (facts, networkCode) =>
  networkCode ? buildNetworkWidgets(facts) : [],
);

/**
 * Campañas agregadas para la pestaña "General" (§B.3 del rediseño de dominio) — reutiliza
 * computeCampaignBreakdown (la misma función que ya usa buildNetworkDashboard para cada
 * pestaña de red) pero sobre `selectFilteredMetricFacts` sin acotar por red. Una campaña
 * que publica en varias redes aparece una sola vez aquí, con sus métricas agregadas —
 * en cada pestaña de red aparece por separado vía selectNetworkDashboard.campaigns,
 * porque `computeCampaignBreakdown` ya agrupa por campaignId sobre los facts recibidos,
 * que en ese caso vienen pre-filtrados a esa red.
 */
export const selectGeneralCampaignBreakdown = createSelector([selectFilteredMetricFacts], computeCampaignBreakdown);

// ── Fase 4: análisis avanzado ───────────────────────────────────────────────

export const selectHeatMap = createSelector([selectFilteredMetricFacts], (facts) => computeHeatMap(facts, MOCK_PUBLISHED_HOUR));

export const selectTimeline = createSelector([selectFilteredMetricFacts], buildTimeline);

export const selectInsights = createSelector([selectFilteredMetricFacts], (facts) => computeInsights(facts, MOCK_PUBLISHED_HOUR));

/** Score del perfil activo (o el primero del catálogo si no hay perfil seleccionado) — mismo BrandScore ya usado en el Overview. */
export const selectActiveBrandScore = createSelector([selectAnalyticsFilters], (filters) => {
  const brand = MOCK_BRAND_METRICS.find((b) => b.id === filters.profileId) ?? MOCK_BRAND_METRICS[0];
  return brand?.score ?? null;
});

/** Explica el Score existente (sin recalcularlo) usando datos de la marca, sin acotar por red — igual criterio que selectFactsForNetworkTabs. */
export const selectScoreExplanation = createSelector(
  [selectFactsForNetworkTabs, selectActiveBrandScore],
  (facts, score) => (score ? buildScoreExplanation(score, facts) : null),
);

export const selectAudienceOverview = createSelector([selectFilteredMetricFacts], (facts) =>
  computeAudienceOverview(facts, MOCK_NETWORK_SPECIFIC_METRICS),
);

export const selectTrendWindows = createSelector([selectFilteredMetricFacts], (facts) =>
  computeTrendAnalysis(facts, CURRENT_RANGE.end, [7, 30, 90]),
);

/** Detalle inline (sin modal) de la publicación seleccionada — fact + sus métricas nativas. */
export const selectSelectedPostDetail = createSelector(
  [selectFilteredMetricFacts, selectAnalyticsFilters],
  (facts, filters) => {
    if (!filters.postId) return null;
    const fact = facts.find((f) => f.postId === filters.postId) ?? null;
    if (!fact) return null;
    return { fact, specific: MOCK_NETWORK_SPECIFIC_METRICS[fact.id] ?? {} };
  },
);

// ── Datos derivados para los widgets existentes (reemplazan a mock-data.ts en metrics/page.tsx) ──

export const selectReachByNetworkData = createSelector([selectFilteredMetricFacts], reachByNetwork);

export const selectEngagementTimeSeries = createSelector([selectFilteredMetricFacts], (facts) =>
  prepareTimeSeries(facts, 'engagementRate'),
);

export const selectTopPosts = createSelector([selectFilteredMetricFacts], (facts) =>
  rankPosts(facts, 'engagementRate', 5),
);
