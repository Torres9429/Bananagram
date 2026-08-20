'use client';

import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState, ChartTitle } from '@repo/ui/ui';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { totalsByNetwork } from '../../lib/analytics/real-metrics';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import type { SocialNetworkCode } from '../../lib/analytics/types';
import { useFilteredCampaignsResult } from './useFilteredCampaigns';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';

/**
 * Compara todas las redes con datos reales (Fase Q). Se quitan "Crecimiento"
 * (seguidores ganados) y "Frecuencia" de la tabla mock — dependen de
 * historial que no existe — y el selector de métrica nativa por red (CTR,
 * saves, etc.) del gráfico, que tampoco se captura hoy.
 *
 * Alcance → Impresiones (2026-08-20, decisión explícita del usuario): la
 * columna/gráfico comparativo usaba `reach`, pero Facebook nunca expone
 * reach por publicación (facebook.mapper.ts: siempre null, a propósito) y
 * ese null se pierde como 0 en varios puntos de campaign-metrics.service.ts
 * (antes de llegar aquí, `CampaignNetworkMetrics.reach` ya no es nullable) —
 * una red sin dato de reach se veía indistinguible de "reach genuinamente
 * cero" (barra invisible, "0" en vez de "—"). `views` (impresiones) sí
 * viene poblado de forma consistente en las 3 redes reales conectadas
 * (Facebook: mediaView; TikTok: videoViews; Instagram: viewsCount), así que
 * es la métrica comparable entre redes que realmente tenemos — se cambia el
 * label a "Impresiones (totales)" para no prometer "alcance único" (personas
 * distintas), que es un concepto distinto de impresiones (veces mostrado).
 * El cálculo de Engagement (abajo) no se tocó — sigue usando `reach` como
 * denominador, sin fallback a views en este widget puntual.
 */
export function NetworkComparison() {
  const dispatch = useDispatch();
  const { campaigns, isLoading } = useFilteredCampaignsResult();
  const networkCodes = useNetworkCodesFilter();
  const rows = totalsByNetwork(campaigns, networkCodes);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <Skeleton variant="text" width={320} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="text" width={140} height={22} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  if (rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin datos para comparar redes" description="Todavía no hay publicaciones con métricas en ninguna red." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <ChartTitle
        title="Comparación entre redes (campañas en Bananagram)"
        description="Impresiones, engagement, publicaciones e interacciones de cada red. Haz clic en una fila o barra para filtrar por esa red."
        info="Impresiones = veces que se mostró el contenido (no personas únicas) — es la métrica más consistente entre redes hoy. Engagement con '—' significa que no hay dato de alcance disponible para esa red, no que sea 0."
      />

      <Box sx={{ overflowX: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Red</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Impresiones (totales)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Engagement</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Publicaciones</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Interacciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const display = NETWORK_DISPLAY[row.networkCode as keyof typeof NETWORK_DISPLAY];
              return (
                <TableRow
                  key={row.networkCode}
                  hover
                  onClick={() => dispatch(selectNetwork(row.networkCode as SocialNetworkCode))}
                  sx={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: display?.color ?? '#9E9E9E' }} />
                      <Typography variant="body2" fontWeight={600}>{display?.label ?? row.networkName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{row.views.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.engagementRate === null ? '—' : `${row.engagementRate}%`}</TableCell>
                  <TableCell align="right">{row.posts}</TableCell>
                  <TableCell align="right">{row.interactions.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>Impresiones por red</Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="networkCode" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <Bar dataKey="views" radius={[4, 4, 0, 0]} onClick={(entry) => dispatch(selectNetwork(entry.networkCode))} style={{ cursor: 'pointer' }}>
            {rows.map((row) => (
              <Cell key={row.networkCode} fill={NETWORK_DISPLAY[row.networkCode as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
