'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { EmptyState } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useDateRangeParams } from './useDateRangeParams';
import { useActiveBrandId } from './useActiveBrandId';

// Datos reales — mismo endpoint que ya usa AccountGrowthOverview
// (SocialAccountMetricSnapshot, poblado cada 6h por el cron), pero recortado
// distinto: en vez de la serie completa, muestra el snapshot actual +
// variación contra el primer punto conocido del rango, por red — un resumen
// de "cómo va la audiencia ahora" en vez de repetir el mismo gráfico de
// tendencia que ya está más abajo en el dashboard.
// Retención de video se deja como estado vacío honesto: Ayrshare/los
// mappers de este proyecto no capturan ese campo para ninguna red hoy.
export function AudienceOverview() {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const { data: history = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });

  const perNetwork = useMemo(() => {
    const byCode = new Map<string, typeof history>();
    for (const point of history) {
      const code = point.socialAccount.socialNetwork.code;
      byCode.set(code, [...(byCode.get(code) ?? []), point]);
    }
    return Array.from(byCode.entries()).map(([code, points]) => {
      const sorted = [...points].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const delta = last.followers - first.followers;
      return { code, current: last.followers, delta };
    });
  }, [history]);

  if (!brandId) return null;

  if (perNetwork.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Todavía no hay suficiente historial" description="El crecimiento se registra cada 6 horas desde que se conecta una red." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Audiencia — resumen actual</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Seguidores actuales por red y variación en el rango seleccionado.
      </Typography>
      <Grid container spacing={2} mb={3}>
        {perNetwork.map(({ code, current, delta }) => {
          const network = NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY];
          const up = delta >= 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={code}>
              <Stack sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }} gap={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{network?.label ?? code}</Typography>
                <Typography variant="h6" fontWeight={700}>{current.toLocaleString('es-MX')}</Typography>
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: up ? '#2E7D32' : '#C62828' }}>
                  {up ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
                  <Typography variant="caption" fontWeight={700}>{Math.abs(delta).toLocaleString('es-MX')} en el rango</Typography>
                </Stack>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
      <EmptyState
        title="Retención de video — pendiente"
        description="Ninguna red conectada expone hoy este dato en la integración con Ayrshare."
      />
    </Paper>
  );
}
