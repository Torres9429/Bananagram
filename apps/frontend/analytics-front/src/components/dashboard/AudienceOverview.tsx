'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { EmptyState, ChartTitle } from '@repo/ui/ui';
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
// Retención de video se deja como estado vacío honesto — TAMPOCO en el
// texto visible al usuario se menciona de dónde viene el dato (nunca
// exponer detalles de integraciones/proveedores en la UI). Hallazgo real
// (2026-08-20, verificado en vivo): TikTok SÍ trae retención por
// publicación (averageTimeWatched/fullVideoWatchedRate en el historial),
// pero NO a nivel de cuenta (que es lo que necesita este widget) — haría
// falta una columna nueva en SocialAccountMetricSnapshot + promediar el
// historial de posts, mismo patrón que ya se usa para Instagram/Facebook
// (ver ayrshare.service.ts). No implementado todavía — alcance a confirmar.
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
      // Con un solo snapshot en el rango, first===last y el delta daría 0
      // siempre — indistinguible de un "sin cambios" real (bug real
      // encontrado 2026-08-20: Facebook con menos sincronizaciones que
      // Instagram/TikTok en el mismo rango mostraba "0 en el rango" sin ser
      // realmente 0, solo sin base de comparación todavía).
      const hasEnoughHistory = sorted.length >= 2;
      const delta = hasEnoughHistory ? last.followers - first.followers : null;
      return { code, current: last.followers, delta, hasEnoughHistory };
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
      <ChartTitle
        title="Audiencia — resumen actual"
        description="Seguidores actuales por red y cuántos ganaste/perdiste en el rango seleccionado."
        info="El número grande es tu total de seguidores ahora mismo en esa red. La cifra de abajo (con flecha) es cuánto cambió desde el inicio del rango de fechas que tienes filtrado — no es el crecimiento histórico completo, solo el de ese periodo."
      />
      <Grid container spacing={2} mb={3}>
        {perNetwork.map(({ code, current, delta, hasEnoughHistory }) => {
          const network = NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY];
          const up = (delta ?? 0) >= 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={code}>
              <Stack sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }} gap={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{network?.label ?? code}</Typography>
                <Typography variant="h6" fontWeight={700}>{current.toLocaleString('es-MX')}</Typography>
                {hasEnoughHistory && delta !== null ? (
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: up ? '#2E7D32' : '#C62828' }}>
                    {up ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
                    <Typography variant="caption" fontWeight={700}>{Math.abs(delta).toLocaleString('es-MX')} en el rango</Typography>
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">Sin historial suficiente en este rango</Typography>
                )}
              </Stack>
            </Grid>
          );
        })}
      </Grid>
      <EmptyState
        title="Retención de video — todavía no disponible"
        description="Estamos trabajando en poder mostrar cuánto tiempo ven tus videos en cada red."
      />
    </Paper>
  );
}
