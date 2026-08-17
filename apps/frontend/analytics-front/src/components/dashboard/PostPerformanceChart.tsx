'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';

// Datos reales, sin backend nuevo más allá de lo ya agregado esta noche
// (topPosts ahora trae likes/comments/shares además de engagementRate).
export function PostPerformanceChart() {
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();

  const data = useMemo(() => {
    const all = campaigns.flatMap((c) => c.topPosts.map((p) => ({ ...p, campaignName: c.name })));
    const filtered = networkCode ? all.filter((p) => p.network === networkCode) : all;
    return filtered
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5)
      .map((p, i) => ({
        label: `#${i + 1} ${p.campaignName}`,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
      }));
  }, [campaigns, networkCode]);

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones con métricas todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Rendimiento por publicación</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="likes" name="Likes" fill="#E0A800" radius={[4, 4, 0, 0]} />
          <Bar dataKey="comments" name="Comentarios" fill="#1565C0" radius={[4, 4, 0, 0]} />
          <Bar dataKey="shares" name="Compartidos" fill="#2E7D32" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
