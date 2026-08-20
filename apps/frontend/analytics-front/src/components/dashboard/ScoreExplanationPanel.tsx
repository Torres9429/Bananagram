'use client';

import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import { EmptyState, ScoreGauge } from '@repo/ui/ui';
import { useGetBrandScoreQuery } from '../../store/api/analytics.api';
import { totalsByNetwork } from '../../lib/analytics/real-metrics';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaignsResult } from './useFilteredCampaigns';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';
import { useActiveBrandId } from './useActiveBrandId';

/**
 * Explica el Score Digital real (GET /brands/:id/score, Fase P3/Q) —
 * decompone los 3 factores que PONDERAN (Consistencia/Engagement/Frecuencia,
 * ver modelo.txt) y señala la red que más contribuyó. "Campaña que más
 * contribuyó" y "publicaciones que más ayudaron/restaron" se quitan: el
 * backend no calcula ese desglose todavía (score.service.ts es a nivel de
 * marca, no hay atribución por campaña/post en el modelo de datos actual).
 */
export function ScoreExplanationPanel() {
  const { campaigns } = useFilteredCampaignsResult();
  const networkCodes = useNetworkCodesFilter();
  const brandId = useActiveBrandId();
  const { data: score, isLoading, isFetching } = useGetBrandScoreQuery(brandId ?? '', { skip: !brandId });

  if ((isLoading || isFetching) && !score) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="text" width="65%" height={22} />
      </Paper>
    );
  }

  if (!score) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin score disponible" description="Se necesita al menos una marca con campañas para calcular el score." />
      </Paper>
    );
  }

  const networks = totalsByNetwork(campaigns, networkCodes).filter((n) => n.engagementRate !== null);
  const topNetwork = networks.length > 0 ? networks.reduce((best, n) => (n.engagementRate! > best.engagementRate! ? n : best)) : null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Score explicado</Typography>

      <Grid container spacing={3} mb={2}>
        <Grid item xs={12} sm={4}>
          <ScoreGauge score={score.score} classification={score.classification} />
        </Grid>
        <Grid item xs={12} sm={8}>
          {/* Solo los 3 factores que PONDERAN (Score = Consistencia×0.30 + Engagement×0.40 +
              Frecuencia×0.30, ver modelo.txt) — Cobertura se muestra aparte, nunca en pie de
              igualdad con estos, ver docs/frontend-db-alignment.md §1.4. */}
          <Stack gap={1.5}>
            {[
              { label: 'Consistencia', value: score.consistency },
              { label: 'Engagement (factor del score, 0-100)', value: score.engagement },
              { label: 'Frecuencia', value: score.frequency },
            ].map((component) => (
              <Stack key={component.label}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">{component.label}</Typography>
                  <Typography variant="caption" fontWeight={700}>{Math.round(component.value * 10) / 10}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, component.value)}
                  sx={{
                    height: 6,
                    borderRadius: 4,
                    bgcolor: '#F5F5F5',
                    '& .MuiLinearProgress-bar': { bgcolor: component.value >= 70 ? '#2E7D32' : component.value < 60 ? '#C62828' : '#E65100' },
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Stack sx={{ p: 1.5, mb: 3, bgcolor: '#FAFAFA', borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">Cobertura (informativa — no pondera en el score)</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">{Math.round(score.coverage * 10) / 10}</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, score.coverage)}
          sx={{ height: 6, borderRadius: 4, bgcolor: '#EEEEEE', '& .MuiLinearProgress-bar': { bgcolor: '#9E9E9E' } }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700}>Red que más contribuyó</Typography>
          <Typography variant="body2" color="text.secondary">
            {topNetwork ? `${NETWORK_DISPLAY[topNetwork.networkCode as keyof typeof NETWORK_DISPLAY]?.label ?? topNetwork.networkName} (${topNetwork.engagementRate}% engagement)` : 'Sin datos suficientes'}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        El score es a nivel de perfil; no existe una versión desagregada por campaña en el modelo de datos actual.
      </Typography>
    </Paper>
  );
}
