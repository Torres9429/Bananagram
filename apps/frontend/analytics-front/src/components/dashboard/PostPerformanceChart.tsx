'use client';

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';

// Datos reales, sin backend nuevo más allá de lo ya agregado esta noche
// (topPosts ahora trae likes/comments/shares además de engagementRate).
// Click en una barra = mismo drill-through que TopContent (auditoría B8).
export function PostPerformanceChart() {
  const dispatch = useDispatch();
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();

  const data = useMemo(() => {
    const all = campaigns.flatMap((c) => c.topPosts.map((p) => ({ ...p, campaignName: c.name, campaignId: c.campaignId })));
    const filtered = networkCode ? all.filter((p) => p.network === networkCode) : all;
    return filtered
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5)
      .map((p, i) => ({
        // Eje X corto (el gráfico no tiene espacio para el caption
        // completo) — el detalle completo va en el tooltip.
        label: `#${i + 1} ${p.contentSnippet.slice(0, 18)}${p.contentSnippet.length > 18 ? '…' : ''}`,
        contentSnippet: p.contentSnippet,
        campaignName: p.campaignName,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        postId: p.postId,
        campaignId: p.campaignId,
      }));
  }, [campaigns, networkCode]);

  function handleBarClick(entry: { campaignId: string; postId: string } | undefined) {
    if (!entry) return;
    dispatch(selectCampaign(entry.campaignId));
    dispatch(selectPost(entry.postId));
  }

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
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <Box sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25, boxShadow: 1, maxWidth: 220 }}>
                  <Typography variant="caption" fontWeight={700} display="block">{point.contentSnippet || 'Sin contenido'}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{point.campaignName}</Typography>
                  <Typography variant="caption" display="block">Likes: {point.likes}</Typography>
                  <Typography variant="caption" display="block">Comentarios: {point.comments}</Typography>
                  <Typography variant="caption" display="block">Compartidos: {point.shares}</Typography>
                </Box>
              );
            }}
          />
          <Legend />
          <Bar dataKey="likes" name="Likes" fill="#E0A800" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
          <Bar dataKey="comments" name="Comentarios" fill="#1565C0" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
          <Bar dataKey="shares" name="Compartidos" fill="#2E7D32" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
