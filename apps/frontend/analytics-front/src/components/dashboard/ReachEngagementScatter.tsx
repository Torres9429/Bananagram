'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaigns } from './useFilteredCampaigns';

// Datos reales — cada punto es una publicación real (de topPosts, top 5 por
// campaña), alcance en X, engagement rate en Y. Sin backend nuevo.
export function ReachEngagementScatter() {
  const campaigns = useFilteredCampaigns();

  const data = useMemo(
    () =>
      campaigns
        .flatMap((c) => c.topPosts.map((p) => ({ ...p, campaignName: c.name })))
        .filter((p) => p.reach > 0)
        .map((p) => ({ x: p.reach, y: p.engagementRate, network: p.network, campaignName: p.campaignName })),
    [campaigns],
  );

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones con alcance registrado todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Alcance vs. engagement</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis type="number" dataKey="x" name="Alcance" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Engagement" unit="%" tick={{ fontSize: 11 }} />
          <RechartsTooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => [name === 'Alcance' ? value.toLocaleString() : `${value}%`, name]}
            labelFormatter={() => ''}
          />
          <Scatter data={data}>
            {data.map((point, i) => (
              <Cell key={i} fill={NETWORK_DISPLAY[point.network as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Paper>
  );
}
