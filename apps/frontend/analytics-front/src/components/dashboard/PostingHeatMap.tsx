'use client';

import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { useGetCampaignMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// Datos reales (Fase Q2) — Post.publishedAt ya trae la hora real, no hacía
// falta ningún dato nuevo del lado del backend para esto (a diferencia de lo
// que asumía la Fase Q original, que lo dejó como EmptyState).
export function PostingHeatMap() {
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;

  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range } : ({} as never),
    { skip: !activeCampaignId },
  );

  const { grid, max } = useMemo(() => {
    const map = new Map<string, number>();
    let maxValue = 0;
    for (const bucket of history?.heatmap ?? []) {
      map.set(`${bucket.dayOfWeek}-${bucket.hour}`, bucket.interactions);
      maxValue = Math.max(maxValue, bucket.interactions);
    }
    return { grid: map, max: maxValue };
  }, [history]);

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>Mapa de calor de publicación</Typography>
      {campaigns.length > 1 && (
        <LabeledSelect label="Campaña" value={activeCampaignId ?? ''} onChange={(e) => setCampaignId((e.target.value as string) || null)} sx={{ mb: 2, maxWidth: 280 }}>
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {grid.size === 0 ? (
        <EmptyState title="Sin publicaciones con métricas todavía" description="Se necesitan posts publicados con al menos una captura de métricas." />
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Stack gap={0.5} sx={{ minWidth: 640 }}>
            {DAY_LABELS.map((label, dayOfWeek) => (
              <Stack key={label} direction="row" gap={0.5} alignItems="center">
                <Typography variant="caption" sx={{ width: 32, color: 'text.secondary' }}>{label}</Typography>
                {HOURS.map((hour) => {
                  const value = grid.get(`${dayOfWeek}-${hour}`) ?? 0;
                  const opacity = max > 0 ? Math.max(0.08, value / max) : 0.08;
                  return (
                    <Tooltip key={hour} title={`${label} ${hour}:00 — ${value} interacciones`}>
                      <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: `rgba(224, 168, 0, ${opacity})` }} />
                    </Tooltip>
                  );
                })}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
