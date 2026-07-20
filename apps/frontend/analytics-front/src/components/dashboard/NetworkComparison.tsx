'use client';

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState } from '@repo/ui';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { selectFactsForNetworkTabs, selectNetworkTabsSummary } from '../../store/analytics.selectors';
import { compareNetworks } from '../../lib/analytics/engine';
import { MOCK_NETWORK_SPECIFIC_METRICS } from '../../lib/mock-data';
import { COMPARABLE_METRICS, NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import type { SocialNetworkCode } from '../../lib/analytics/types';

/**
 * Compara todas las redes al mismo tiempo. La tabla superior reutiliza
 * selectNetworkTabsSummary (Fase 3) tal cual; la gráfica inferior usa
 * compareNetworks (Fase 4) — solo participan las redes que reportan la
 * métrica elegida (COMPARABLE_METRICS.networks).
 */
export function NetworkComparison() {
  const dispatch = useDispatch();
  const facts = useSelector(selectFactsForNetworkTabs);
  const summary = useSelector(selectNetworkTabsSummary);
  const [metricKey, setMetricKey] = useState(COMPARABLE_METRICS[0].key);

  const metric = COMPARABLE_METRICS.find((m) => m.key === metricKey)!;
  const chartData = useMemo(
    () => compareNetworks(facts, metric.key, metric.networks, MOCK_NETWORK_SPECIFIC_METRICS),
    [facts, metric],
  );

  const summaryRows = Object.entries(summary);
  if (summaryRows.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin datos para comparar redes" description="Ajusta los filtros activos." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparación entre redes</Typography>

      <Table size="small" sx={{ mb: 3 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Red</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Alcance</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Engagement</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Crecimiento</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Publicaciones</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Frecuencia</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Interacciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summaryRows.map(([code, kpis]) => (
            <TableRow
              key={code}
              hover
              onClick={() => dispatch(selectNetwork(code as SocialNetworkCode))}
              sx={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
            >
              <TableCell>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: NETWORK_DISPLAY[code as SocialNetworkCode].color }} />
                  <Typography variant="body2" fontWeight={600}>{NETWORK_DISPLAY[code as SocialNetworkCode].label}</Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">{kpis.totalReach.toLocaleString()}</TableCell>
              <TableCell align="right">{kpis.avgEngagement}%</TableCell>
              <TableCell align="right">+{kpis.followersGained.toLocaleString()}</TableCell>
              <TableCell align="right">{kpis.postsCount}</TableCell>
              <TableCell align="right">{(kpis.postsCount / 2).toFixed(1)}/sem</TableCell>
              <TableCell align="right">{kpis.totalInteractions.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">Comparar por métrica</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metricKey}
          onChange={(_, value) => value && setMetricKey(value)}
        >
          {COMPARABLE_METRICS.map((m) => (
            <ToggleButton key={m.key} value={m.key} sx={{ textTransform: 'none', px: 1.5 }}>
              {m.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {chartData.length === 0 ? (
        <EmptyState title={`Ninguna red con datos de "${metric.label}"`} description="Esta métrica no aplica a las redes activas." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
            <XAxis dataKey="networkCode" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit={metric.unit ?? ''} />
            <RechartsTooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(entry) => dispatch(selectNetwork(entry.networkCode))} style={{ cursor: 'pointer' }}>
              {chartData.map((entry) => (
                <Cell key={entry.networkCode} fill={NETWORK_DISPLAY[entry.networkCode].color} style={{ transition: 'opacity 0.15s ease' }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
