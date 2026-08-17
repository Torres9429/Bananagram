'use client';

import { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect, MetricCard } from '@repo/ui/ui';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useGetPostMetricsQuery } from '../../store/api/analytics.api';
import { useFilteredCampaigns } from './useFilteredCampaigns';

// Datos reales — nuevo endpoint (Rama 5, GET campaigns/:id/posts/:postId/
// metrics) reusando la misma consulta DISTINCT ON que ya usa el resto del
// service, ahora acotada a las entregas de UN post. La lista de posts para
// elegir sale de topPosts (ya calculado por campaña) — no existe todavía un
// listado general de posts en analytics-front, así que se acota a los que
// ya tienen métricas suficientes para aparecer ahí.
export function SelectedPostDetail() {
  const campaigns = useFilteredCampaigns();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.campaignId ?? null;
  const activeCampaign = campaigns.find((c) => c.campaignId === activeCampaignId);

  const options = useMemo(
    () => (activeCampaign?.topPosts ?? []).map((p) => ({ ...p, key: `${p.postId}:${p.network}` })),
    [activeCampaign],
  );
  const [postKey, setPostKey] = useState<string | null>(null);
  const activeOption = options.find((o) => o.key === postKey) ?? options[0] ?? null;

  const { data: detail } = useGetPostMetricsQuery(
    activeOption ? { campaignId: activeCampaignId!, postId: activeOption.postId } : ({} as never),
    { skip: !activeOption },
  );

  if (campaigns.length === 0 || options.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones con métricas todavía" description="Se necesitan posts publicados con al menos una captura de métricas." />
      </Paper>
    );
  }

  const delivery = detail?.byNetwork.find((n) => n.networkCode === activeOption?.network);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Detalle de publicación</Typography>
      <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
        {campaigns.length > 1 && (
          <LabeledSelect label="Campaña" value={activeCampaignId ?? ''} onChange={(e) => { setCampaignId((e.target.value as string) || null); setPostKey(null); }} sx={{ minWidth: 220 }}>
            {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
          </LabeledSelect>
        )}
        <LabeledSelect label="Publicación" value={activeOption?.key ?? ''} onChange={(e) => setPostKey(e.target.value as string)} sx={{ minWidth: 260 }}>
          {options.map((o) => {
            const network = NETWORK_DISPLAY[o.network as keyof typeof NETWORK_DISPLAY];
            return (
              <MenuItem key={o.key} value={o.key}>
                {network?.label ?? o.network} · {o.date ? new Date(o.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
              </MenuItem>
            );
          })}
        </LabeledSelect>
      </Stack>

      {!delivery ? (
        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
      ) : (
        <>
          {detail && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {detail.content.split('\n')[0]?.slice(0, 140) || 'Sin contenido'}
            </Typography>
          )}
          <Stack direction="row" gap={1} mb={2}>
            <Chip size="small" label={NETWORK_DISPLAY[delivery.networkCode as keyof typeof NETWORK_DISPLAY]?.label ?? delivery.networkCode} />
            {delivery.engagementRate !== null && (
              <Chip size="small" label={`${delivery.engagementRate}% engagement`} sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
            )}
          </Stack>
          {!delivery.hasMetrics ? (
            <EmptyState title="Sin métricas capturadas todavía" description="La sincronización con Ayrshare corre cada 6 horas, o puedes forzarla desde el detalle de la campaña." />
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><MetricCard icon={<FavoriteBorderIcon />} label="Likes" value={delivery.likes} /></Grid>
              <Grid item xs={6} sm={3}><MetricCard icon={<ChatBubbleOutlineIcon />} label="Comentarios" value={delivery.comments} /></Grid>
              <Grid item xs={6} sm={3}><MetricCard icon={<ShareOutlinedIcon />} label="Compartidos" value={delivery.shares} /></Grid>
              <Grid item xs={6} sm={3}><MetricCard icon={<VisibilityOutlinedIcon />} label="Vistas" value={delivery.views} /></Grid>
            </Grid>
          )}
        </>
      )}
    </Paper>
  );
}
