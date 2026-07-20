'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { EmptyState, ScoreGauge } from '@repo/ui/ui';
import { selectScoreExplanation } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

/**
 * Explica el Score Digital existente (buildScoreExplanation, Fase 4) — no
 * introduce una fórmula nueva, decompone los 3 componentes que PONDERAN
 * (Consistencia/Engagement/Frecuencia) y señala qué red/campaña/publicaciones
 * más influyeron. `coverage` se muestra aparte, como dato informativo — nunca
 * como un 4º factor del score (ver modelo.txt / docs/frontend-db-alignment.md §1.4).
 */
export function ScoreExplanationPanel() {
  const explanation = useSelector(selectScoreExplanation);
  if (!explanation) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin score disponible" description="Selecciona un perfil para ver su explicación de score." />
      </Paper>
    );
  }

  const { score, positiveFactors, negativeFactors, topNetwork, topCampaign, bestPosts, worstPosts } = explanation;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Score explicado</Typography>

      <Grid container spacing={3} mb={2}>
        <Grid item xs={12} sm={4}>
          <ScoreGauge score={score.score} classification={score.classification} />
        </Grid>
        <Grid item xs={12} sm={8}>
          {/* Solo los 3 factores que PONDERAN (Score = Consistencia×0.30 + Engagement×0.40 +
              Frecuencia×0.30, ver modelo.txt) — Cobertura se muestra aparte más abajo, nunca
              en pie de igualdad con estos, ver docs/frontend-db-alignment.md §1.4. */}
          <Stack gap={1.5}>
            {[
              { label: 'Consistencia', value: score.consistency },
              { label: 'Engagement', value: score.engagement },
              { label: 'Frecuencia', value: score.frequency },
            ].map((component) => (
              <Stack key={component.label}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">{component.label}</Typography>
                  <Typography variant="caption" fontWeight={700}>{component.value}</Typography>
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

      {/* Cobertura vive separada de los 3 factores ponderados de arriba — es informativa,
          NO forma parte de la fórmula del Score (ver modelo.txt / docs/frontend-db-alignment.md §1.4). */}
      <Stack sx={{ p: 1.5, mb: 3, bgcolor: '#FAFAFA', borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">Cobertura (informativa — no pondera en el score)</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">{score.coverage}</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, score.coverage)}
          sx={{ height: 6, borderRadius: 4, bgcolor: '#EEEEEE', '& .MuiLinearProgress-bar': { bgcolor: '#9E9E9E' } }}
        />
      </Stack>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700} mb={1}>Factores positivos</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {positiveFactors.length === 0 && <Typography variant="caption" color="text.secondary">Ninguno por encima del umbral.</Typography>}
            {positiveFactors.map((f) => (
              <Chip key={f.key} size="small" label={`${f.label}: ${f.value}`} sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }} />
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700} mb={1}>Factores a mejorar</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {negativeFactors.length === 0 && <Typography variant="caption" color="text.secondary">Ninguno por debajo del umbral.</Typography>}
            {negativeFactors.map((f) => (
              <Chip key={f.key} size="small" label={`${f.label}: ${f.value}`} sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700}>Red que más contribuyó</Typography>
          <Typography variant="body2" color="text.secondary">
            {topNetwork ? `${NETWORK_DISPLAY[topNetwork.networkCode].label} (${topNetwork.engagement}% engagement)` : 'Sin datos suficientes'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700}>Campaña que más contribuyó</Typography>
          <Typography variant="body2" color="text.secondary">
            {topCampaign ? `${topCampaign.campaignName} (${topCampaign.sharePercent}% del crecimiento)` : 'Sin datos suficientes'}
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700} mb={1}>Publicaciones que más ayudaron</Typography>
          <Stack gap={0.5}>
            {bestPosts.map((p) => (
              <Typography key={p.id} variant="caption" color="text.secondary">• {p.postTitle} ({p.engagement}%)</Typography>
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" fontWeight={700} mb={1}>Publicaciones que más restaron</Typography>
          <Stack gap={0.5}>
            {worstPosts.map((p) => (
              <Typography key={p.id} variant="caption" color="text.secondary">• {p.postTitle} ({p.engagement}%)</Typography>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        El score es a nivel de perfil; no existe una versión desagregada por campaña en el modelo de datos actual.
      </Typography>
    </Paper>
  );
}
