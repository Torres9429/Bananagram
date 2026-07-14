'use client';

import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { TrendCard } from '@repo/ui/ui';
import { selectAnalyticsKpiComparison } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import type { SocialNetworkCode } from '../../lib/analytics/types';

function trendOf(delta: number): 'up' | 'down' | 'flat' {
  return delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
}

/**
 * Resumen de rendimiento — de la red seleccionada, o agregado de todas ("General",
 * networkCode=null). Reutiliza selectAnalyticsKpiComparison (Fase 1) tal cual — como
 * applyAnalyticsFilters ya respeta selectedNetwork, este selector devuelve los KPIs
 * acotados a la red (o sin acotar, en General) sin ningún cambio adicional.
 */
export function NetworkOverview({ networkCode }: { networkCode: SocialNetworkCode | null }) {
  const { current, deltas } = useSelector(selectAnalyticsKpiComparison);
  const display = networkCode ? NETWORK_DISPLAY[networkCode] : { label: 'General', color: '#E0A800' };

  return (
    <Box mb={3}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: display.color }} />
        <Typography variant="subtitle1" fontWeight={700}>{display.label} — Resumen</Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <TrendCard
            icon={<VisibilityOutlinedIcon />}
            label="Alcance"
            value={current.totalReach}
            deltaPercent={deltas.totalReach}
            trend={trendOf(deltas.totalReach)}
            comparisonLabel="vs. semana anterior"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <TrendCard
            icon={<TrendingUpOutlinedIcon />}
            label="Engagement rate"
            value={current.avgEngagementRate}
            unit="%"
            deltaPercent={deltas.avgEngagementRate}
            trend={trendOf(deltas.avgEngagementRate)}
            comparisonLabel="vs. semana anterior"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <TrendCard
            icon={<FavoriteBorderOutlinedIcon />}
            label="Interacciones"
            value={current.totalInteractions}
            deltaPercent={deltas.totalInteractions}
            trend={trendOf(deltas.totalInteractions)}
            comparisonLabel="vs. semana anterior"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <TrendCard
            icon={<GroupsOutlinedIcon />}
            label="Growth (seguidores)"
            value={current.followersGained}
            deltaPercent={deltas.followersGained}
            trend={trendOf(deltas.followersGained)}
            comparisonLabel="vs. semana anterior"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
