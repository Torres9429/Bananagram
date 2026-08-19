'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { EmptyState, MetricCard, ScoreGauge } from '@repo/ui/ui';
import { useGetBrandScoreQuery, useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useDateRangeParams } from './useDateRangeParams';
import { useActiveBrandId } from './useActiveBrandId';
import { useAccountMetricsSummary } from './useAccountMetricsSummary';

// Visible solo para Cliente/Administrador (decisión confirmada) — el backend
// ya lo exige (ScoreController/BrandsController.assertIsBrandOwnerOrAdmin,
// 403 para CM/Diseñador), esto solo evita llamadas innecesarias desde una
// sección que no les correspondería ver.
//
// 2026-08-19: fusiona lo que antes eran 2 Paper separados ("Resumen" de
// NetworkOverview + "Cuenta — panorama general" de este componente) — al
// pasar ambos a leer de la misma cuenta completa (useAccountMetricsSummary),
// quedaron mostrando datos parcialmente duplicados en 2 tarjetas con estilos
// distintos, uno justo debajo del otro (Publicaciones/Vistas aparecían en
// los dos). Ahora es una sola tarjeta ancla: fila de KPIs arriba, Score +
// gráfico de crecimiento abajo (esos 2 ya funcionaban bien, se mantienen tal
// cual). `NetworkOverview.tsx` quedó sin consumidores y se borró.
//
// networkCode: null = agregado de todas las redes (tab "General", respeta el
// multi-select de red del Drawer vía useAccountMetricsSummary), o un código
// específico ('instagram', etc.) para la pestaña de esa sola red.
export function AccountGrowthOverview({ networkCode = null }: { networkCode?: string | null }) {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const display = networkCode
    ? (NETWORK_DISPLAY[networkCode as keyof typeof NETWORK_DISPLAY] ?? { label: networkCode, color: '#9E9E9E' })
    : { label: 'General', color: '#E0A800' };

  const { data: score } = useGetBrandScoreQuery(brandId ?? '', { skip: !brandId });
  const { data: rawHistory = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });
  const history = useMemo(
    () => (networkCode ? rawHistory.filter((point) => point.socialAccount.socialNetwork.code === networkCode) : rawHistory),
    [rawHistory, networkCode],
  );

  const { chartData, networkCodes } = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    const codes = new Set<string>();
    for (const point of history) {
      const code = point.socialAccount.socialNetwork.code;
      codes.add(code);
      const date = point.capturedAt.slice(0, 10);
      const row = byDate.get(date) ?? {};
      row[code] = point.followers; // última captura del día gana (Map conserva orden de inserción, la respuesta ya viene ordenada asc)
      byDate.set(date, row);
    }
    const rows = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));
    return { chartData: rows, networkCodes: Array.from(codes) };
  }, [history]);

  const { data: metrics, hasData } = useAccountMetricsSummary(networkCode);

  if (!brandId) return null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: display.color }} />
        <Typography variant="subtitle1" fontWeight={700}>
          {networkCode ? `${display.label} — Resumen de cuenta` : 'Cuenta — panorama general'}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Cuenta completa conectada — con o sin campañas, no solo lo publicado desde Bananagram.
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<VisibilityOutlinedIcon />} label="Alcance" value={hasData ? metrics!.reach : null} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<TrendingUpOutlinedIcon />} label="Engagement" value={hasData ? metrics!.engagementRate : null} unit="%" />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<FavoriteBorderOutlinedIcon />} label="Interacciones" value={hasData ? metrics!.interactions : null} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<GroupsOutlinedIcon />} label="Seguidores" value={hasData ? metrics!.followers : null} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<ArticleOutlinedIcon />} label="Publicaciones" value={hasData ? metrics!.posts : null} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <MetricCard icon={<VisibilityOutlinedIcon />} label="Vistas" value={hasData ? metrics!.views : null} />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          {score ? (
            <ScoreGauge score={score.score} classification={score.classification} />
          ) : (
            <Typography variant="body2" color="text.secondary">Calculando score…</Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={8}>
          <Typography variant="body2" color="text.secondary" mb={1}>Crecimiento de seguidores</Typography>
          {chartData.length < 2 ? (
            <EmptyState
              title="Todavía no hay suficiente historial"
              description="El crecimiento se registra cada 6 horas desde que se conecta una red — vuelve más tarde para ver la tendencia."
            />
          ) : (
            <Stack>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  {networkCodes.map((code) => (
                    <Line
                      key={code}
                      type="monotone"
                      dataKey={code}
                      name={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code}
                      stroke={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}
