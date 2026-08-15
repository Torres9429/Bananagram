'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { MetricCard } from '@repo/ui/ui';
import { sumMetrics } from '../../lib/analytics/real-metrics';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import type { SocialNetworkCode } from '../../lib/analytics/types';
import { useFilteredCampaigns } from './useFilteredCampaigns';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';
import { useLatestFollowers } from './useLatestFollowers';

/**
 * Resumen de rendimiento — de la red seleccionada, o agregado de todas
 * ("General", networkCode=null). Datos reales (Fase Q) — sin delta "vs.
 * semana anterior": no hay snapshots históricos, solo la última captura por
 * cuenta (ver campaign-metrics.service.ts), así que no hay con qué comparar.
 * Absorbe lo que antes era GeneralMetricCards (Seguidores/Publicaciones,
 * eliminado) — eran las mismas campañas filtradas mostradas en un Paper
 * aparte justo debajo, puro duplicado.
 */
export function NetworkOverview({ networkCode }: { networkCode: SocialNetworkCode | null }) {
  const campaigns = useFilteredCampaigns();
  const networkCodes = useNetworkCodesFilter();
  const brandId = campaigns[0]?.brandId;
  const latestFollowers = useLatestFollowers(brandId);
  const display = networkCode ? NETWORK_DISPLAY[networkCode] : { label: 'General', color: '#E0A800' };

  const metrics = sumMetrics(campaigns, networkCode, networkCodes);
  const followers = networkCode
    ? (latestFollowers[networkCode] ?? 0)
    : Object.entries(latestFollowers)
        .filter(([code]) => !networkCodes || networkCodes.includes(code))
        .reduce((sum, [, value]) => sum + value, 0);

  return (
    <Box mb={3}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: display.color }} />
        <Typography variant="subtitle1" fontWeight={700}>{display.label} — Resumen</Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard icon={<VisibilityOutlinedIcon />} label="Alcance" value={metrics.reach} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard icon={<TrendingUpOutlinedIcon />} label="Engagement rate" value={metrics.engagementRate ?? 0} unit="%" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard icon={<FavoriteBorderOutlinedIcon />} label="Interacciones" value={metrics.interactions} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard icon={<GroupsOutlinedIcon />} label="Seguidores actuales" value={followers} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard icon={<ArticleOutlinedIcon />} label="Publicaciones" value={metrics.posts} />
        </Grid>
      </Grid>
    </Box>
  );
}
