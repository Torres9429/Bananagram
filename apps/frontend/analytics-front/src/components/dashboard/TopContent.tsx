'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { EmptyState } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';

// Datos reales (Fase Q2 → esta sesión): computeTopPost pasó a
// rankPostsByEngagement en el backend, que ahora devuelve topPosts (top 5 por
// campaña) además del topPost único que ya usaba CampaignComparison. Este
// widget junta el top 5 de cada campaña visible, respeta el filtro de red
// activo, y muestra el top 5 global entre todas.
export function TopContent() {
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();

  const topPosts = useMemo(() => {
    const all = campaigns.flatMap((c) =>
      c.topPosts.map((p) => ({ ...p, campaignName: c.name })),
    );
    const filtered = networkCode ? all.filter((p) => p.network === networkCode) : all;
    return filtered.sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);
  }, [campaigns, networkCode]);

  if (topPosts.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones con métricas todavía" description="Se necesitan posts publicados con al menos una captura de métricas." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Publicaciones destacadas</Typography>
      <Stack gap={1.25}>
        {topPosts.map((post, i) => {
          const network = NETWORK_DISPLAY[post.network as keyof typeof NETWORK_DISPLAY];
          return (
            <Stack
              key={`${post.postId}-${post.network}`}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={1.5}
              sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ width: 20, color: 'text.secondary' }}>#{i + 1}</Typography>
                <Box>
                  <Typography variant="body2" fontWeight={600} noWrap>{post.campaignName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {post.date ? new Date(post.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1}>
                <Chip size="small" label={network?.label ?? post.network} sx={{ bgcolor: `${network?.color ?? '#9E9E9E'}18`, color: network?.color ?? '#9E9E9E', fontWeight: 700 }} />
                <Typography variant="subtitle2" fontWeight={700}>{post.engagementRate}%</Typography>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}

