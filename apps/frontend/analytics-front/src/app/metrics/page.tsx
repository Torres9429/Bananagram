'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useDispatch, useSelector } from 'react-redux';
import { EmptyState, usePermissions } from '@repo/ui';
import { AnalyticsFilterBar } from '../../components/dashboard/AnalyticsFilterBar';
import { AnalyticsBreadcrumb } from '../../components/dashboard/AnalyticsBreadcrumb';
import { NetworkOverview } from '../../components/dashboard/NetworkOverview';
import { EngagementChart } from '../../components/dashboard/EngagementChart';
import { NetworkMetricCards } from '../../components/dashboard/NetworkMetricCards';
import { GeneralMetricCards } from '../../components/dashboard/GeneralMetricCards';
import { CampaignBreakdown } from '../../components/dashboard/CampaignBreakdown';
import { TopContent } from '../../components/dashboard/TopContent';
import { InsightsPanel } from '../../components/dashboard/InsightsPanel';
import { ScoreExplanationPanel } from '../../components/dashboard/ScoreExplanationPanel';
import { SelectedPostDetail } from '../../components/dashboard/SelectedPostDetail';
import { NetworkComparison } from '../../components/dashboard/NetworkComparison';
import { CampaignComparison } from '../../components/dashboard/CampaignComparison';
import { TrendAnalysis } from '../../components/dashboard/TrendAnalysis';
import { PostingHeatMap } from '../../components/dashboard/PostingHeatMap';
import { ActivityTimeline } from '../../components/dashboard/ActivityTimeline';
import { AudienceOverview } from '../../components/dashboard/AudienceOverview';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectSelectedNetwork } from '../../store/analytics.selectors';
import type { SocialNetworkCode } from '../../lib/analytics/types';

// Pestañas de primer nivel (§B.1/§B.2 del rediseño de dominio): "General" + una por
// red. El valor de cada Tab reutiliza directamente SocialNetworkCode — no existe un
// estado de tab separado del filtro de red ya existente en Redux (selectedNetwork):
// cambiar de tab ES seleccionar la red, mismo mecanismo que ya usaban
// SocialNetworkTabs/NetworkComparison, ahora promovido a navegación de primer nivel.
type TabValue = 'general' | SocialNetworkCode;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'IG', label: 'Instagram' },
  { value: 'FB', label: 'Facebook' },
  { value: 'TK', label: 'TikTok' },
  { value: 'LI', label: 'LinkedIn' },
  { value: 'X', label: 'X' },
  { value: 'YT', label: 'YouTube' },
];

export default function MetricsPage() {
  const { can } = usePermissions();
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const activeTab: TabValue = selectedNetwork ?? 'general';

  if (!can('metrics', 'view')) {
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
            <Tab key={tab.value} value={tab.value} label={tab.label} sx={{ textTransform: 'none', fontWeight: 600, '&.Mui-selected': { color: '#E0A800' }  }} />
          ))}
        </Tabs>

        {/* Exportación pendiente (§B.5): debe serializar exactamente la vista ya
            renderizada de la pestaña activa, nunca recalcular ni pedir configuración
            — ReportExporter.tsx existente apunta a un backend inexistente (POST
            /api/reports) y no sigue ese contrato, por eso no se conecta aquí todavía. */}
        <Tooltip title="Exportación pendiente — próxima fase">
          <span>
            <Button variant="outlined" size="small" disabled sx={{ borderColor: '#E8E8E8', color: '#9E9E9E', flexShrink: 0 }}>
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
          <NetworkOverview networkCode={null} />
          <EngagementChart />
          <GeneralMetricCards />
          <CampaignBreakdown />
          <TopContent />
          <InsightsPanel />
          <ScoreExplanationPanel />

          <NetworkComparison />
          <CampaignComparison />
          <TrendAnalysis />
          <PostingHeatMap />
          {/* <ActivityTimeline /> */}
          <AudienceOverview />
        </>
      )}
    </Box>
  );
}
