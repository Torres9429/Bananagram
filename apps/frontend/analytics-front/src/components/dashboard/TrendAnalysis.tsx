'use client';

import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { useGetCampaignMetricsHistoryQuery, type CampaignHistoryDay } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';

const WINDOWS = [7, 30, 90] as const;

function trendIcon(delta: number) {
  if (delta > 0.5) return <TrendingUpIcon fontSize="small" sx={{ color: '#2E7D32' }} />;
  if (delta < -0.5) return <TrendingDownIcon fontSize="small" sx={{ color: '#C62828' }} />;
  return <TrendingFlatIcon fontSize="small" sx={{ color: '#9E9E9E' }} />;
}

function windowDelta(series: CampaignHistoryDay[], days: number, field: 'reach' | 'interactions') {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const compareIndex = Math.max(0, series.length - 1 - days);
  const previous = series[compareIndex];
  if (!previous || previous === latest) return null;
  const current = latest[field];
  const before = previous[field];
  const deltaPercent = before > 0 ? Math.round(((current - before) / before) * 1000) / 10 : null;
  return { current, before, deltaPercent };
}

// Datos reales (Fase Q2) — compara el valor más reciente de la serie diaria
// contra el de hace 7/30/90 días. Igual que EngagementChart, se enfoca en
// una campaña a la vez (selector) por la misma razón: mezclar series de
// campañas distintas en la misma comparación no tendría sentido.
export function TrendAnalysis() {
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const networkCode = useSelectedNetwork();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;

  // networkCode agregado 2026-08-20 — mismo bug/fix que EngagementChart.
  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range, networkCode: networkCode ?? undefined } : ({} as never),
    { skip: !activeCampaignId },
  );

  const reachTrend = useMemo(() => (history ? windowDelta(history.series, days, 'reach') : null), [history, days]);
  const interactionsTrend = useMemo(() => (history ? windowDelta(history.series, days, 'interactions') : null), [history, days]);

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>Análisis de tendencia</Typography>
        <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, value) => value && setDays(value)}>
          {WINDOWS.map((w) => (
            <ToggleButton key={w} value={w} sx={{ textTransform: 'none', px: 1.5 }}>{w} días</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {campaigns.length > 1 && (
        <LabeledSelect label="Campaña" value={activeCampaignId ?? ''} onChange={(e) => setCampaignId((e.target.value as string) || null)} sx={{ mb: 2, maxWidth: 280 }}>
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {!reachTrend && !interactionsTrend ? (
        <EmptyState title="Todavía no hay suficiente historial" description={`Se necesita al menos ${days} días de métricas capturadas para comparar.`} />
      ) : (
        <Grid container spacing={2}>
          {[{ label: 'Alcance', trend: reachTrend }, { label: 'Interacciones', trend: interactionsTrend }].map(({ label, trend }) => (
            <Grid item xs={12} sm={6} key={label}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                {trend?.deltaPercent != null ? trendIcon(trend.deltaPercent) : <TrendingFlatIcon fontSize="small" sx={{ color: '#9E9E9E' }} />}
                <Stack>
                  <Typography variant="body2" fontWeight={700}>
                    {trend ? trend.current.toLocaleString() : '—'}
                    {trend?.deltaPercent != null && (
                      <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                        ({trend.deltaPercent > 0 ? '+' : ''}{trend.deltaPercent}%)
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{label} vs. hace {days} días</Typography>
                </Stack>
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
}
