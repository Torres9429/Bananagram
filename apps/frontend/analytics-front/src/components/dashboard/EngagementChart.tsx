'use client';

import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState, LabeledSelect } from '@repo/ui/ui';
import { useGetCampaignMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useFilteredCampaigns } from './useFilteredCampaigns';

// Datos reales (Fase Q2, GET /campaigns/:id/metrics-history) — a diferencia
// del resto del dashboard (que agrega todas las campañas visibles a la
// vez), este gráfico necesita UNA serie de tiempo continua, así que se
// enfoca en una sola campaña a la vez (selector, igual criterio que
// CampaignComparison) en vez de mezclar series de campañas distintas en la
// misma línea.
export function EngagementChart() {
  const campaigns = useFilteredCampaigns();
  const range = useDateRangeParams();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;

  const { data: history } = useGetCampaignMetricsHistoryQuery(
    activeCampaignId ? { campaignId: activeCampaignId, range } : ({} as never),
    { skip: !activeCampaignId },
  );

  if (campaigns.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1}>Tendencia de engagement</Typography>
      {campaigns.length > 1 && (
        <LabeledSelect
          label="Campaña"
          value={activeCampaignId ?? ''}
          onChange={(e) => setCampaignId((e.target.value as string) || null)}
          sx={{ mb: 2, maxWidth: 280 }}
        >
          {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
        </LabeledSelect>
      )}
      {!history || history.series.length < 2 ? (
        <EmptyState title="Todavía no hay suficiente historial" description="Se necesitan al menos 2 días con métricas capturadas para trazar una tendencia." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <RechartsTooltip />
            <Line type="monotone" dataKey="engagementRate" name="Engagement" stroke="#E0A800" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
