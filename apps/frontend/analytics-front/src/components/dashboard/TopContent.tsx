'use client';

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { EmptyState } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaignsResult } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';

// Datos reales (Fase Q2 → esta sesión): computeTopPost pasó a
// rankPostsByEngagement en el backend, que ahora devuelve topPosts (top 5 por
// campaña) además del topPost único que ya usaba CampaignComparison. Este
// widget junta el top 5 de cada campaña visible, respeta el filtro de red
// activo, y muestra el top 5 global entre todas.
//
// Click en una fila = drill-through real a SelectedPostDetail (auditoría
// B8: selectPost() existía en el slice pero nada lo disparaba desde un click
// real) — dispara selectCampaign+selectPost juntos porque SelectedPostDetail
// necesita ambos ids para pedir GET campaigns/:id/posts/:postId/metrics.
export function TopContent() {
  const dispatch = useDispatch();
  const { campaigns, isLoading } = useFilteredCampaignsResult();
  const networkCode = useSelectedNetwork();

  const topPosts = useMemo(() => {
    const all = campaigns.flatMap((c) =>
      c.topPosts.map((p) => ({ ...p, campaignName: c.name, campaignId: c.campaignId })),
    );
    const filtered = networkCode ? all.filter((p) => p.network === networkCode) : all;
    return filtered.sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);
  }, [campaigns, networkCode]);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Skeleton variant="text" width={230} height={28} sx={{ mb: 2 }} />
        <Stack gap={1.25}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={58} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

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
            // Bug real (2026-08-20), confirmado en vivo (getBoundingClientRect
            // en un viewport de 375px mostraba esta fila a 515px de ancho):
            // esta fila es un Stack (flex) que a su vez es hijo directo de
            // otro Stack en columna (la lista completa) — un contenedor flex
            // en columna estira a sus hijos por defecto, pero si el hijo es
            // TAMBIÉN un contenedor flex, el navegador igual le calcula un
            // "ancho mínimo automático" a partir del contenido de SUS
            // propios hijos (el texto sin truncar), y ese mínimo gana sobre
            // el ancho estirado — sin importar el overflow:hidden/flex:1/
            // minWidth:0 puestos más adentro, si a esta fila (el nivel de
            // arriba) no se le pone su propio minWidth:0, el navegador la
            // deja crecer hasta ese mínimo automático y se sale de la
            // tarjeta (y de la página entera, al no estar contenida en
            // ningún ancestro con overflow-x). overflow:hidden solo aquí no
            // bastaba — hacía falta minWidth:0 en este mismo nivel.
            <Stack
              key={`${post.postId}-${post.network}`}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={1.5}
              onClick={() => {
                dispatch(selectCampaign(post.campaignId));
                dispatch(selectPost(post.postId));
              }}
              sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', transition: 'background-color 0.15s ease', '&:hover': { bgcolor: '#FAFAFA' } }}
            >
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ width: 20, flexShrink: 0, color: 'text.secondary' }}>#{i + 1}</Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} noWrap title={post.contentSnippet}>
                    {post.contentSnippet || 'Sin contenido'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {post.campaignName} · {post.date ? new Date(post.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
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

