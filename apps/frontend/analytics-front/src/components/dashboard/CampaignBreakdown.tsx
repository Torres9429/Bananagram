'use client';

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { EmptyState } from '@repo/ui/ui';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { scopedMetrics } from '../../lib/analytics/real-metrics';
import { useSelectedNetwork } from './useSelectedNetwork';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';

/**
 * Alcance por campaña — datos reales (Fase Q, GET /campaigns/metrics-summary).
 * A diferencia de la versión mock, no hay filtro cruzado al hacer clic en una
 * barra (esa interacción dependía de facts por-post con granularidad que el
 * backend no expone hoy) — solo lectura.
 */
export function CampaignBreakdown() {
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();
  const networkCodes = useNetworkCodesFilter();

  const data = campaigns.map((c) => ({ campaignId: c.campaignId, campaignName: c.name, reach: scopedMetrics(c, networkCode, networkCodes).reach }));

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin campañas con datos todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Rendimiento por campaña</Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="campaignName" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.campaignId} fill="#E0A800" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
