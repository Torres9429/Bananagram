'use client';

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, ReferenceLine } from 'recharts';
import { EmptyState, ChartTitle } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useSelectedNetwork } from './useSelectedNetwork';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';

// Datos reales — cada punto es UNA publicación real (top 5 por campaña),
// alcance en X, engagement rate en Y. Click en un punto = mismo drill-through
// que TopContent/PostPerformanceChart (auditoría B8/H).
//
// Antes no filtraba por la tab de red activa (mostraba puntos de TODAS las
// redes mezclados incluso dentro de la tab de una sola) y no tenía ninguna
// leyenda explicando qué significa cada color/eje — feedback del usuario
// (2026-08-19): "no entiendo la de Alcance vs. engagement".
export function ReachEngagementScatter() {
  const dispatch = useDispatch();
  const campaigns = useFilteredCampaigns();
  const networkCode = useSelectedNetwork();

  const allData = useMemo(
    () =>
      campaigns
        .flatMap((c) => c.topPosts.map((p) => ({ ...p, campaignName: c.name, campaignId: c.campaignId })))
        .filter((p) => p.reach > 0)
        .map((p) => ({ x: p.reach, y: p.engagementRate, network: p.network, campaignName: p.campaignName, contentSnippet: p.contentSnippet, postId: p.postId, campaignId: p.campaignId })),
    [campaigns],
  );
  const data = useMemo(
    () => (networkCode ? allData.filter((p) => p.network === networkCode) : allData),
    [allData, networkCode],
  );
  const networksShown = useMemo(() => Array.from(new Set(data.map((p) => p.network))), [data]);
  const avgEngagement = useMemo(
    () => (data.length > 0 ? data.reduce((sum, p) => sum + p.y, 0) / data.length : 0),
    [data],
  );

  function handlePointClick(point: { campaignId: string; postId: string } | undefined) {
    if (!point) return;
    dispatch(selectCampaign(point.campaignId));
    dispatch(selectPost(point.postId));
  }

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones con alcance registrado todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <ChartTitle
        title="Alcance vs. engagement"
        description="Cada punto es una publicación — más a la derecha llegó a más gente, más arriba generó más interacción."
        info="Eje X (Alcance): a cuánta gente le llegó la publicación. Eje Y (Engagement): qué tanto interactuó esa gente (interacciones ÷ alcance). La línea punteada es el promedio de lo que ves — los puntos por encima funcionaron mejor que el promedio. Haz clic en un punto para ver su detalle completo."
        mb={1.5}
      />
      {networksShown.length > 1 && (
        <Stack direction="row" gap={2} flexWrap="wrap" mb={1.5}>
          {networksShown.map((code) => {
            const display = NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY];
            return (
              <Stack key={code} direction="row" alignItems="center" gap={0.75}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: display?.color ?? '#9E9E9E' }} />
                <Typography variant="caption" color="text.secondary">{display?.label ?? code}</Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis type="number" dataKey="x" name="Alcance" tick={{ fontSize: 11 }} label={{ value: 'Alcance', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#757575' }} />
          <YAxis type="number" dataKey="y" name="Engagement" unit="%" tick={{ fontSize: 11 }} label={{ value: 'Engagement %', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#757575' }} />
          <RechartsTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              const display = NETWORK_DISPLAY[point.network as keyof typeof NETWORK_DISPLAY];
              return (
                <Box sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25, boxShadow: 1, maxWidth: 220 }}>
                  <Typography variant="caption" fontWeight={700} display="block">{point.contentSnippet || 'Sin contenido'}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{point.campaignName} · {display?.label ?? point.network}</Typography>
                  <Typography variant="caption" display="block">Alcance: {point.x.toLocaleString()}</Typography>
                  <Typography variant="caption" display="block">Engagement: {point.y}%</Typography>
                </Box>
              );
            }}
          />
          {avgEngagement > 0 && <ReferenceLine y={avgEngagement} stroke="#9E9E9E" strokeDasharray="4 4" />}
          <Scatter data={data} onClick={handlePointClick} style={{ cursor: 'pointer' }}>
            {data.map((point, i) => (
              <Cell key={i} fill={NETWORK_DISPLAY[point.network as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Paper>
  );
}
