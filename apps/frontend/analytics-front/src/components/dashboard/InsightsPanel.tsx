'use client';

import { useMemo, useState, type ReactElement } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useGetCampaignMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const DAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Datos reales — 3 de los 4 insights originales resultaron estar ya
// disponibles en endpoints que otros widgets del mismo dashboard ya
// consumen (mismo criterio que PostingHeatMap): "mejor hora" viene del
// heatmap (getMetricsHistory), "mejor red" de byNetwork (getCampaignMetrics,
// vía useFilteredCampaigns), y el delta de alcance semana-contra-semana de
// la serie diaria (getMetricsHistory). El cuarto — campaña top por
// seguidores — sigue sin dato real: los seguidores viven en SocialAccount,
// no atribuidos por campaña, se dejaría de estado vacío honesto si se
// necesitara mostrar (no se construye acá, ver Rama 5 del plan).
export function InsightsPanel() {
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;
  const activeCampaign = campaigns.find((c) => c.campaignId === activeCampaignId);

  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range } : ({} as never),
    { skip: !activeCampaignId },
  );

  const bestHour = useMemo(() => {
    if (!history?.heatmap?.length) return null;
    const best = [...history.heatmap].sort((a, b) => b.interactions - a.interactions)[0];
    if (!best || best.interactions === 0) return null;
    return `${DAY_LABELS[best.dayOfWeek]} a las ${String(best.hour).padStart(2, '0')}:00`;
  }, [history]);

  const bestNetwork = useMemo(() => {
    if (!activeCampaign?.byNetwork?.length) return null;
    const withRate = activeCampaign.byNetwork.filter((n) => n.engagementRate !== null);
    if (withRate.length === 0) return null;
    const best = withRate.sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))[0];
    return { label: NETWORK_DISPLAY[best.networkCode as keyof typeof NETWORK_DISPLAY]?.label ?? best.networkName, rate: best.engagementRate };
  }, [activeCampaign]);

  const reachDelta = useMemo(() => {
    const series = history?.series ?? [];
    if (series.length < 14) return null;
    const last7 = series.slice(-7).reduce((sum, d) => sum + d.reach, 0);
    const prev7 = series.slice(-14, -7).reduce((sum, d) => sum + d.reach, 0);
    if (prev7 === 0) return null;
    const pct = Math.round(((last7 - prev7) / prev7) * 1000) / 10;
    return pct;
  }, [history]);

  const insights = [
    bestHour && { icon: <ScheduleOutlinedIcon />, color: '#E65100', bg: '#FFF3E0', text: `La mejor hora para publicar es el ${bestHour}.` },
    bestNetwork && { icon: <ShareOutlinedIcon />, color: '#0A66C2', bg: '#E3F2FD', text: `${bestNetwork.label} es tu red con mejor engagement (${bestNetwork.rate}%).` },
    reachDelta !== null && {
      icon: <TrendingUpOutlinedIcon />,
      color: reachDelta >= 0 ? '#2E7D32' : '#C62828',
      bg: reachDelta >= 0 ? '#E8F5E9' : '#FFEBEE',
      text: `El alcance de los últimos 7 días ${reachDelta >= 0 ? 'subió' : 'bajó'} ${Math.abs(reachDelta)}% contra la semana anterior.`,
    },
  ].filter((i): i is { icon: ReactElement; color: string; bg: string; text: string } => !!i);

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>Insights automáticos</Typography>
      {campaigns.length > 1 && (
        <LabeledSelect label="Campaña" value={activeCampaignId ?? ''} onChange={(e) => setCampaignId((e.target.value as string) || null)} sx={{ mb: 2, maxWidth: 280 }}>
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {insights.length === 0 ? (
        <EmptyState title="Sin suficiente historial todavía" description="Los insights necesitan al menos dos semanas de métricas capturadas." />
      ) : (
        <Stack gap={1.25}>
          {insights.map((insight, i) => (
            <Stack key={i} direction="row" alignItems="center" gap={1.5} sx={{ p: 1.5, borderRadius: 2, bgcolor: insight.bg }}>
              <Stack sx={{ color: insight.color }}>{insight.icon}</Stack>
              <Typography variant="body2" fontWeight={600} sx={{ color: insight.color }}>{insight.text}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
