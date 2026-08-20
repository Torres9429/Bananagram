'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { EmptyState, usePermissions, useToast } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { exportVisibleMetricsAsPdf } from '../../lib/export-metrics-pdf';
import { AnalyticsFilterBar } from '../../components/dashboard/AnalyticsFilterBar';
import { AnalyticsBreadcrumb } from '../../components/dashboard/AnalyticsBreadcrumb';
import { EngagementChart } from '../../components/dashboard/EngagementChart';
import { NetworkMetricCards } from '../../components/dashboard/NetworkMetricCards';
import { CampaignBreakdown } from '../../components/dashboard/CampaignBreakdown';
import { TopContent } from '../../components/dashboard/TopContent';
import { InsightsPanel } from '../../components/dashboard/InsightsPanel';
import { ScoreExplanationPanel } from '../../components/dashboard/ScoreExplanationPanel';
import { SelectedPostDetail } from '../../components/dashboard/SelectedPostDetail';
import { NetworkComparison } from '../../components/dashboard/NetworkComparison';
import { CampaignComparison } from '../../components/dashboard/CampaignComparison';
import { TrendAnalysis } from '../../components/dashboard/TrendAnalysis';
import { PostingHeatMap } from '../../components/dashboard/PostingHeatMap';
import { AudienceOverview } from '../../components/dashboard/AudienceOverview';
import { AccountGrowthOverview } from '../../components/dashboard/AccountGrowthOverview';
import { NetworkRadarComparison } from '../../components/dashboard/NetworkRadarComparison';
import { PostPerformanceChart } from '../../components/dashboard/PostPerformanceChart';
import { ReachEngagementScatter } from '../../components/dashboard/ReachEngagementScatter';
import { ContentTypeBreakdown } from '../../components/dashboard/ContentTypeBreakdown';
import { AudienceGenderAgeChart } from '../../components/dashboard/AudienceGenderAgeChart';
import { AudienceGenderPie } from '../../components/dashboard/AudienceGenderPie';
import { AudienceCountryChart } from '../../components/dashboard/AudienceCountryChart';
import {
  analyticsApi,
  useGetBrandSocialAccountsQuery,
  useGetCampaignsMetricsSummaryQuery,
  useRefreshBrandMetricsMutation,
  useRefreshCampaignMetricsMutation,
} from '../../store/api/analytics.api';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectSelectedNetwork } from '../../store/analytics.selectors';
import { useActiveBrandId } from '../../components/dashboard/useActiveBrandId';
import { useDateRangeParams } from '../../components/dashboard/useDateRangeParams';
import type { TabValue } from '../../interfaces/interface';

const ALL_NETWORK_TABS: { value: TabValue; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YouTube' },
];

export default function MetricsPage() {
  const { can } = usePermissions();
  const { showError, showSuccess, showInfo } = useToast();
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const range = useDateRangeParams();
  const activeTab: TabValue = selectedNetwork ?? 'general';
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const {
    data: campaignsData,
    isLoading: isCampaignsLoading,
    isFetching: isCampaignsFetching,
  } = useGetCampaignsMetricsSummaryQuery(range);
  const isDashboardLoading = (isCampaignsLoading || isCampaignsFetching) && !campaignsData;

  // Exporta exactamente lo que está renderizado en contentRef en este
  // momento — ya refleja marca/campaña/red/rango activos, sin volver a
  // pedirlos ni recalcular nada del lado del servidor.
  async function handleExport() {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const scope = activeTab === 'general' ? 'general' : activeTab;
      await exportVisibleMetricsAsPdf(contentRef.current, `metricas-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showSuccess('PDF exportado correctamente.');
    } catch {
      showError('No se pudo generar el PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  // Score + crecimiento de cuenta: el backend exige ownership real
  // (assertIsBrandOwnerOrAdmin, 403 para CM/Diseñador) — esto solo decide si
  // la sección existe en la página, mismo criterio que ya usa Sidebar.tsx
  // para "¿esta identidad es dueña/gestora de marca?". Bug real (2026-08-20):
  // el `|| can('score','ver')` de acá colaba al CM (que sí tiene score:ver,
  // legítimo para otras pantallas) — la sección igual le salía vacía porque
  // el backend la sigue negando por ownership, viéndose como un bug. `marcas:
  // crear`/`marcas:editar` sin score:ver ya identifica exactamente a
  // cliente/administrador (únicos con ambos en el seed) sin nombrar el rol.
  const showAccountOverview = can('marcas', 'crear') || can('marcas', 'editar');

  // Solo mostrar pestañas de redes que el usuario tiene realmente
  // conectadas — antes las 6 aparecían siempre, aunque no hubiera ninguna
  // cuenta vinculada para esa red. brandId ya NO depende de que existan
  // campañas (useActiveBrandId) — una marca recién conectada, sin ninguna
  // campaña todavía, ahora sí muestra sus pestañas de red reales.
  const brandId = useActiveBrandId();
  const { data: socialAccounts = [] } = useGetBrandSocialAccountsQuery(brandId ?? '', { skip: !brandId });
  const connectedCodes = new Set(socialAccounts.filter((account) => account.active).map((account) => account.socialNetwork.code));
  const TABS = [
    { value: 'general' as TabValue, label: 'General' },
    ...ALL_NETWORK_TABS.filter((tab) => connectedCodes.has(tab.value)),
  ];

  // Refresh al entrar a Métricas (2026-08-17) — una vez por montaje (o por
  // cambio real de marca/campaña seleccionada), nunca polling. Muestra el
  // cache existente de inmediato (no bloquea la pantalla); dispara la
  // llamada real a Ayrshare en segundo plano y, al terminar, los widgets se
  // refrescan solos vía invalidatesTags. Máximo 2 llamadas a Ayrshare por
  // entrada: cuenta social completa (siempre, si hay brandId) + la campaña
  // actualmente seleccionada (solo si el usuario ya entró al detalle de
  // una) — nunca una por cada campaña filtrada, para no arriesgar rate
  // limits de Ayrshare (decisión explícita, ver reporte de la auditoría).
  const [refreshBrandMetrics, { isLoading: isRefreshingBrand }] = useRefreshBrandMetricsMutation();
  const [refreshCampaignMetrics, { isLoading: isRefreshingCampaign }] = useRefreshCampaignMetricsMutation();

  useEffect(() => {
    if (!brandId) return;
    refreshBrandMetrics(brandId);
  }, [brandId, refreshBrandMetrics]);

  useEffect(() => {
    if (!filters.campaignId) return;
    refreshCampaignMetrics(filters.campaignId);
  }, [filters.campaignId, refreshCampaignMetrics]);

  // Botón "Actualizar" — mismo tope de 2 llamadas reales a Ayrshare que el
  // refresh automático de arriba (marca + la campaña filtrada, si hay una;
  // nunca una por cada campaña visible, mismo criterio anti-rate-limit).
  // Además fuerza a releer nuestra propia BD para TODO lo que esté montado
  // en este momento (resumen general incluido, que el refresh automático no
  // cubre si no hay una campaña específica filtrada).
  async function handleRefresh() {
    dispatch(
      analyticsApi.util.invalidateTags([
        'CampaignsMetricsSummary',
        'Brands',
        'BrandScore',
        'SocialAccounts',
        'BrandMetricsHistory',
        'BrandScoreHistory',
        'CampaignMetricsHistory',
        'AccountMetricsSummary',
      ]),
    );

    const refreshPromises: Promise<unknown>[] = [];
    if (brandId) refreshPromises.push(refreshBrandMetrics(brandId).unwrap());
    if (filters.campaignId) refreshPromises.push(refreshCampaignMetrics(filters.campaignId).unwrap());

    if (refreshPromises.length === 0) {
      showInfo('No hay una marca activa para refrescar todavía.');
      return;
    }

    const results = await Promise.allSettled(refreshPromises);
    const failed = results.some((result) => result.status === 'rejected');
    if (failed) {
      showError('No se pudo completar la actualización de todas las métricas.');
      return;
    }
    showSuccess('Métricas actualizadas con éxito.');
  }
  const isRefreshing = isRefreshingBrand || isRefreshingCampaign;

  // Mientras la sesión aún no hidrata desde la cookie, `can()` siempre da
  // false (permissions arranca en {}) — sin este guard se veía un flash de
  // "No tienes permisos" aunque sí los tuviera. Mismo patrón que profile/page.tsx.
  if (!user) return null;

  if (!can('metricas', 'ver')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <EmptyState title="No tienes permisos para ver métricas" />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <AnalyticsFilterBar />

      {/* Sin título propio arriba (el TopBar ya muestra "Métricas") — el botón
          de exportar va junto a las pestañas para no dejar una fila vacía. */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} gap={1}>
        <Tabs
          value={activeTab}
          onChange={(_, value: TabValue) => dispatch(selectNetwork(value === 'general' ? null : value))}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, flex: 1, minWidth: 0, '& .MuiTab-root': { minHeight: 40, py: 1 } }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: 'primary.main' }  }} />
          ))}
        </Tabs>

        <Tooltip title="Volver a pedir los datos más recientes">
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshOutlinedIcon />}
              onClick={handleRefresh}
              disabled={isRefreshing}
              sx={{ borderColor: 'divider', color: 'secondary.main', flexShrink: 0, '&:hover': { borderColor: 'primary.main' } }}
            >
              {isRefreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </span>
        </Tooltip>

        {/* Captura exactamente lo renderizado en contentRef — nunca recalcula
            ni pide configuración aparte, el PDF coincide con lo que ya se ve
            filtrado en pantalla. */}
        {can('metricas', 'exportar') && (
          <Tooltip title="Descargar como PDF lo que estás viendo">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlinedIcon />}
                onClick={handleExport}
                disabled={isExporting}
                sx={{ borderColor: 'divider', color: 'secondary.main', flexShrink: 0, '&:hover': { borderColor: 'primary.main' } }}
              >
                {isExporting ? 'Generando…' : 'Exportar'}
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      <AnalyticsBreadcrumb />

      <Box ref={contentRef} sx={{ bgcolor: '#F7F7F7' }}>
      {isDashboardLoading ? (
        <Stack gap={2}>
          <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} />
        </Stack>
      ) : filters.postId ? (
        <SelectedPostDetail />
      ) : selectedNetwork ? (
        // ── Pestaña de red — estructura estricta, idéntica en las 6 (§B.2) ──
        <>
          {showAccountOverview && <AccountGrowthOverview networkCode={selectedNetwork} />}
          <EngagementChart />
          <NetworkMetricCards />
          <CampaignBreakdown />
          <PostPerformanceChart />
          <ReachEngagementScatter />
          <TopContent />
          <InsightsPanel />
          {/* Antes solo existía en General, agregado entre TODAS las redes —
              acá se filtra a lo publicado en esta red específica (feedback
              del usuario, 2026-08-19). Si la campaña no publicó nada en esta
              red, muestra su propio estado vacío explicándolo. */}
          <PostingHeatMap networkCode={selectedNetwork} />
          {/* Demografía solo donde Ayrshare realmente la expone (Sección F/
              Sección 4 de la auditoría) — nunca en General, y nunca en
              Facebook/X (sin dato real). Country: Instagram + TikTok (K/O ya
              mapeado). Edad×género: solo Instagram (TikTok da 2 arrays
              separados, no un cruce real, ver account-metrics-mapper.registry.ts). */}
          {showAccountOverview && selectedNetwork === 'instagram' && <AudienceGenderAgeChart networkCode={selectedNetwork} />}
          {showAccountOverview && selectedNetwork === 'instagram' && <AudienceGenderPie networkCode={selectedNetwork} />}
          {showAccountOverview && (selectedNetwork === 'instagram' || selectedNetwork === 'tiktok') && (
            <AudienceCountryChart networkCode={selectedNetwork} />
          )}
        </>
      ) : (
        // ── General — misma base de 6 secciones + widgets embebidos (§B.3), nunca sub-tabs ──
        <>
          {showAccountOverview && <AccountGrowthOverview />}
          <EngagementChart />
          <CampaignBreakdown />
          <PostPerformanceChart />
          <ReachEngagementScatter />
          <ContentTypeBreakdown />
          <TopContent />
          <InsightsPanel />
          {showAccountOverview && <ScoreExplanationPanel />}

          <NetworkComparison />
          <NetworkRadarComparison />
          <CampaignComparison />
          <TrendAnalysis />
          <PostingHeatMap />
          <AudienceOverview />
          {/* Demografía por edad/género/país se movió a las tabs de red
              específicas (Instagram/TikTok) — mostrarla en General mezclaba
              redes sin atribución (auditoría B9) y sugería una comparabilidad
              que no existe (Sección F). */}
        </>
      )}
      </Box>
    </Box>
  );
}
