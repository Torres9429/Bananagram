'use client';

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import { EmptyState, LabeledSelect, MetricCard, ChartTitle } from '@repo/ui/ui';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useGetPostMetricsQuery } from '../../store/api/analytics.api';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';

// Datos reales — nuevo endpoint (Rama 5, GET campaigns/:id/posts/:postId/
// metrics) reusando la misma consulta DISTINCT ON que ya usa el resto del
// service, ahora acotada a las entregas de UN post. La lista de posts para
// elegir sale de topPosts (ya calculado por campaña) — no existe todavía un
// listado general de posts en analytics-front, así que se acota a los que
// ya tienen métricas suficientes para aparecer ahí.
//
// campaignId/postId ahora vienen de Redux (filters.campaignId/postId), no de
// useState local — es lo que permite que un click de drill-through real
// (TopContent, PostPerformanceChart) aterrice aquí mostrando el post
// correcto (auditoría B8: antes este componente ignoraba por completo el
// slice y solo se podía navegar con sus propios selects).
export function SelectedPostDetail() {
  const dispatch = useDispatch();
  const filters = useSelector(selectAnalyticsFilters);
  const campaigns = useFilteredCampaigns();
  const activeCampaignId = filters.campaignId ?? campaigns[0]?.campaignId ?? null;
  const activeCampaign = campaigns.find((c) => c.campaignId === activeCampaignId);

  const options = useMemo(
    () => (activeCampaign?.topPosts ?? []).map((p) => ({ ...p, key: `${p.postId}:${p.network}` })),
    [activeCampaign],
  );
  // postKey desambigua red cuando el mismo postId aparece en topPosts de más
  // de una red — filters.postId (Redux) solo trae el id, así que se resuelve
  // a la primera opción que matchee; el usuario puede cambiar de red vía el
  // select de abajo sin perder el drill-down (sigue siendo el mismo post).
  const [manualPostKey, setManualPostKey] = useState<string | null>(null);
  const activeOption =
    options.find((o) => o.key === manualPostKey) ??
    (filters.postId ? options.find((o) => o.postId === filters.postId) : undefined) ??
    options[0] ??
    null;

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
      <ChartTitle
        title="Detalle de publicación"
        description="Likes, comentarios, compartidos y vistas de una publicación específica."
        info="Elige la campaña y la publicación para ver su detalle completo. Si no hay métricas capturadas todavía, la sincronización con la red corre cada 6 horas."
      />
      <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
        {campaigns.length > 1 && (
          <LabeledSelect
            label="Campaña"
            value={activeCampaignId ?? ''}
            onChange={(e) => {
              dispatch(selectCampaign((e.target.value as string) || null));
              dispatch(selectPost(null));
              setManualPostKey(null);
            }}
            sx={{ minWidth: 220 }}
          >
            {campaigns.map((c) => <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>)}
          </LabeledSelect>
        )}
        <LabeledSelect
          label="Publicación"
          value={activeOption?.key ?? ''}
          onChange={(e) => {
            const key = e.target.value as string;
            setManualPostKey(key);
            const option = options.find((o) => o.key === key);
            if (option) dispatch(selectPost(option.postId));
          }}
          sx={{ minWidth: 260 }}
        >
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
            // Bug real (2026-08-20): xs={6} truncaba el valor de la tarjeta
            // (WidgetCard, variant="h5" + noWrap) en celular — mismo bug y
            // mismo fix que AccountGrowthOverview.tsx: xs={12} apila una
            // columna en el celular más angosto, sm={3} sigue siendo 4
            // columnas como antes a partir de 600px.
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}><MetricCard icon={<FavoriteBorderIcon />} label="Likes" value={delivery.likes} /></Grid>
              <Grid item xs={12} sm={3}><MetricCard icon={<ChatBubbleOutlineIcon />} label="Comentarios" value={delivery.comments} /></Grid>
              <Grid item xs={12} sm={3}><MetricCard icon={<ShareOutlinedIcon />} label="Compartidos" value={delivery.shares} /></Grid>
              <Grid item xs={12} sm={3}><MetricCard icon={<VisibilityOutlinedIcon />} label="Vistas" value={delivery.views} /></Grid>
            </Grid>
          )}
        </>
      )}
    </Paper>
  );
}
