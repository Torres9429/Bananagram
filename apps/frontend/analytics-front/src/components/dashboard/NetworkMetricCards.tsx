'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { MetricCard } from '@repo/ui/ui';
import { selectNetworkDashboard } from '../../store/analytics.selectors';

/** Elige un ícono razonable según el nombre de la métrica — sin lógica de negocio, solo presentación. */
function iconFor(key: string) {
  const k = key.toLowerCase();
  if (k.includes('time') || k.includes('duration')) return <AccessTimeOutlinedIcon />;
  if (k.includes('follow') || k.includes('profile') || k.includes('visit')) return <GroupsOutlinedIcon />;
  if (k.includes('rate') || k.includes('ctr') || k.includes('retention') || k.includes('completion')) return <TrendingUpOutlinedIcon />;
  if (k.includes('save') || k.includes('bookmark') || k.includes('favorite')) return <BookmarkBorderOutlinedIcon />;
  if (k.includes('comment') || k.includes('repl') || k.includes('quote')) return <ChatBubbleOutlineOutlinedIcon />;
  return <BarChartOutlinedIcon />;
}

/**
 * Grid completo de métricas nativas de la red seleccionada — config-driven vía
 * NETWORK_METRIC_FIELDS (network-config.ts), no hardcodeado por red en este componente.
 * Agregar una red nueva no requiere tocar este archivo.
 */
export function NetworkMetricCards() {
  const dashboard = useSelector(selectNetworkDashboard);
  if (!dashboard) return null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Métricas de la red</Typography>
      <Grid container spacing={2}>
        {dashboard.metrics.map((metric) => (
          <Grid item xs={6} sm={4} md={3} key={metric.key}>
            <MetricCard icon={iconFor(metric.key)} label={metric.label} value={metric.value} unit={metric.unit ?? ''} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
