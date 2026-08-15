'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useDispatch, useSelector } from 'react-redux';
import { EmptyState, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AnalyticsFilterBar } from '../../components/dashboard/AnalyticsFilterBar';
import { AnalyticsBreadcrumb } from '../../components/dashboard/AnalyticsBreadcrumb';
import { NetworkOverview } from '../../components/dashboard/NetworkOverview';
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
import { useGetBrandSocialAccountsQuery } from '../../store/api/analytics.api';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectSelectedNetwork } from '../../store/analytics.selectors';
import { useFilteredCampaigns } from '../../components/dashboard/useFilteredCampaigns';
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
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const activeTab: TabValue = selectedNetwork ?? 'general';

  // Score + crecimiento de cuenta: exclusivo de Cliente/Administrador
  // (decisión confirmada) — el backend ya lo exige aparte
  // (assertIsBrandOwnerOrAdmin, 403 para CM/Diseñador), esto solo decide si
  // la sección existe en la página. El resto del dashboard (por campaña) no
  // necesita ningún chequeo de rol aquí: GET /campaigns/metrics-summary y
  // /campaigns/:id/metrics-history ya vienen acotados server-side por
  // pertenencia (CampaignsService.listCampaigns/assertCanView) — un usuario
  // con varios roles (ej. CM + Diseñador) ve la unión automáticamente,
  // porque el filtrado real ocurre en el backend, no aquí.
  const roles = user?.roles ?? [];
  const showAccountOverview = roles.includes('cliente') || roles.includes('administrador');

  // Solo mostrar pestañas de redes que el usuario tiene realmente
  // conectadas — antes las 6 aparecían siempre, aunque no hubiera ninguna
  // cuenta vinculada para esa red.
  const campaigns = useFilteredCampaigns();
  const brandId = campaigns[0]?.brandId;
  const { data: socialAccounts = [] } = useGetBrandSocialAccountsQuery(brandId ?? '', { skip: !brandId });
  const connectedCodes = new Set(socialAccounts.filter((account) => account.active).map((account) => account.socialNetwork.code));
  const TABS = [
    { value: 'general' as TabValue, label: 'General' },
    ...ALL_NETWORK_TABS.filter((tab) => connectedCodes.has(tab.value)),
  ];

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

        {/* Exportación pendiente (§B.5): debe serializar exactamente la vista ya
            renderizada de la pestaña activa, nunca recalcular ni pedir configuración
            — sin backend real de reportes todavía, por eso no se conecta aquí. */}
        <Tooltip title="Exportación pendiente — próxima fase">
          <span>
            <Button variant="outlined" size="small" disabled sx={{ borderColor: 'divider', color: '#9E9E9E', flexShrink: 0 }}>
              Exportar
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <AnalyticsBreadcrumb />

      {filters.postId ? (
        <SelectedPostDetail />
      ) : selectedNetwork ? (
        // ── Pestaña de red — estructura estricta, idéntica en las 6 (§B.2) ──
        <>
          {showAccountOverview && <AccountGrowthOverview networkCode={selectedNetwork} />}
          <NetworkOverview networkCode={selectedNetwork} />
          <EngagementChart />
          <NetworkMetricCards />
          <CampaignBreakdown />
          <TopContent />
          <InsightsPanel />
        </>
      ) : (
        // ── General — misma base de 6 secciones + widgets embebidos (§B.3), nunca sub-tabs ──
        <>
          {showAccountOverview && <AccountGrowthOverview />}
          <NetworkOverview networkCode={null} />
          <EngagementChart />
          <CampaignBreakdown />
          <TopContent />
          <InsightsPanel />
          {showAccountOverview && <ScoreExplanationPanel />}

          <NetworkComparison />
          <CampaignComparison />
          <TrendAnalysis />
          <PostingHeatMap />
          <AudienceOverview />
        </>
      )}
    </Box>
  );
}
