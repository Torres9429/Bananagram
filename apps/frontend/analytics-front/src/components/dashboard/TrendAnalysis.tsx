'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { selectTrendWindows } from '../../store/analytics.selectors';

const DIRECTION_ICON = { up: TrendingUpIcon, down: TrendingDownIcon, flat: TrendingFlatIcon } as const;
const DIRECTION_COLOR = { up: '#2E7D32', down: '#C62828', flat: '#8F8F8F' } as const;
const DIRECTION_LABEL = { up: 'Subió', down: 'Bajó', flat: 'Se mantiene' } as const;

/**
 * Compara 7 / 30 / 90 días (computeTrendAnalysis, Fase 4 — generaliza
 * compareKpiPeriods de Fase 1). Con ~2 semanas de datos mock, las ventanas de
 * 30/90 días muestran honestamente "sin datos suficientes" en vez de inventar
 * una tendencia — quedan listas para cuando haya más historial.
 */
export function TrendAnalysis() {
  const windows = useSelector(selectTrendWindows);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Tendencias</Typography>
      <Grid container spacing={2}>
        {windows.map((w) => {
          const Icon = DIRECTION_ICON[w.direction];
          return (
            <Grid item xs={12} sm={4} key={w.days}>
              <Box sx={{ p: 2, border: '1px solid #E8E8E8', borderRadius: 3, opacity: w.hasData ? 1 : 0.5, transition: 'opacity 0.15s ease' }}>
                <Typography variant="caption" color="text.secondary">Últimos {w.days} días</Typography>
                {w.hasData ? (
                  <>
                    <Stack direction="row" alignItems="center" gap={0.75} mt={0.5}>
                      <Icon sx={{ color: DIRECTION_COLOR[w.direction] }} fontSize="small" />
                      <Typography variant="h6" fontWeight={700} sx={{ color: DIRECTION_COLOR[w.direction] }}>
                        {DIRECTION_LABEL[w.direction]}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Engagement {w.current.avgEngagementRate}% ({w.deltaPercent > 0 ? '+' : ''}{w.deltaPercent}%)
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>Sin datos suficientes</Typography>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}
