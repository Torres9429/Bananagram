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
import { EmptyState } from '@repo/ui/ui';
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
 * saves, etc.) del gráfico, que tampoco se captura hoy. El gráfico se queda
 * fijo en Alcance.
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
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparación entre redes (campañas en Bananagram)</Typography>

      <Box sx={{ overflowX: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Red</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Alcance</TableCell>
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
                  <TableCell align="right">{row.reach.toLocaleString()}</TableCell>
                  <TableCell align="right">{row.engagementRate === null ? '—' : `${row.engagementRate}%`}</TableCell>
                  <TableCell align="right">{row.posts}</TableCell>
                  <TableCell align="right">{row.interactions.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>Alcance por red</Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="networkCode" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <RechartsTooltip />
          <Bar dataKey="reach" radius={[4, 4, 0, 0]} onClick={(entry) => dispatch(selectNetwork(entry.networkCode))} style={{ cursor: 'pointer' }}>
            {rows.map((row) => (
              <Cell key={row.networkCode} fill={NETWORK_DISPLAY[row.networkCode as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
