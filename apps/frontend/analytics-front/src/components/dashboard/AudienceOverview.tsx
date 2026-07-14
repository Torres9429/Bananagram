'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { MetricCard } from '@repo/ui/ui';
import { selectAudienceOverview } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

/**
 * Visión de audiencia (computeAudienceOverview, Fase 4) — reutiliza
 * computeAudienceMetrics (Fase 3) y groupByNetwork (Fase 1) por dentro.
 */
export function AudienceOverview() {
  const data = useSelector(selectAudienceOverview);
  const maxFollowers = Math.max(1, ...data.followersByNetwork.map((n) => n.followersGained));

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Audiencia</Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <MetricCard icon={<GroupsOutlinedIcon />} label="Crecimiento (seguidores)" value={data.followersGained} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard icon={<FavoriteBorderOutlinedIcon />} label="Interacciones" value={data.totalInteractions} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard icon={<EventRepeatOutlinedIcon />} label="Frecuencia" value={data.postsPerWeek} unit=" posts/sem" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<VisibilityOutlinedIcon />}
            label="Retención promedio"
            value={data.avgRetention ?? 0}
            unit={data.avgRetention !== null ? '%' : ''}
            formatter={data.avgRetention === null ? () => 'N/D' : undefined}
          />
        </Grid>
      </Grid>

      <Typography variant="body2" fontWeight={700} mb={1}>Distribución de crecimiento por red</Typography>
      <Stack gap={1}>
        {data.followersByNetwork.map((n) => (
          <Stack key={n.networkCode} direction="row" alignItems="center" gap={1.5}>
            <Typography variant="caption" sx={{ width: 70 }}>{NETWORK_DISPLAY[n.networkCode].label}</Typography>
            <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: '#F5F5F5', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${(n.followersGained / maxFollowers) * 100}%`,
                  bgcolor: NETWORK_DISPLAY[n.networkCode].color,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ width: 50, textAlign: 'right' }}>+{n.followersGained}</Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
