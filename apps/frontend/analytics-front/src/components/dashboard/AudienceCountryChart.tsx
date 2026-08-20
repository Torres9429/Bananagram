'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useActiveBrandId } from './useActiveBrandId';
import { useDateRangeParams } from './useDateRangeParams';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

// Intl.DisplayNames (nativo del navegador, sin librería nueva) — Ayrshare
// devuelve el código ISO ("US"), nunca el nombre completo. Si el código no
// es un ISO-3166 válido (defensivo, nunca visto en vivo), se muestra el
// código tal cual en vez de romper.
const countryNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['es'], { type: 'region' }) : null;
function countryLabel(code: string): string {
  try {
    return countryNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

// Datos reales — confirmado en vivo, shape { "US": 161, ... } (código de
// país, no nombre completo — Ayrshare no lo traduce). Top 8 países.
// networkCode: se renderiza solo dentro de la tab de Instagram/TikTok (única
// que lo tiene, ver Sección F de la auditoría) — cuando se pasa, filtra el
// historial a esa red específica en vez de "la más reciente de cualquiera".
export function AudienceCountryChart({ networkCode }: { networkCode?: string } = {}) {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const { data: history = [], isFetching: loadingHistory } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });

  const { data, sourceNetwork } = useMemo(() => {
    const scoped = networkCode ? history.filter((p) => p.socialAccount.socialNetwork.code === networkCode) : history;
    const latestWithData = [...scoped].reverse().find((p) => p.audienceCountry);
    if (!latestWithData?.audienceCountry) return { data: [], sourceNetwork: null as string | null };
    const rows = Object.entries(latestWithData.audienceCountry)
      .map(([country, value]) => ({ country, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return { data: rows, sourceNetwork: latestWithData.socialAccount.socialNetwork.code };
  }, [history, networkCode]);

  if (!brandId) return null;

  if (loadingHistory) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Países principales de la audiencia</Typography>
        <Skeleton variant="rounded" height={240} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Países principales de la audiencia</Typography>
        <EmptyState
          title="Sin demografía disponible todavía"
          description="Instagram solo libera este dato cuando la cuenta acumula al menos 100 interacciones en los últimos 30 días."
        />
      </Paper>
    );
  }

  const sourceLabel = sourceNetwork ? NETWORK_DISPLAY[sourceNetwork as keyof typeof NETWORK_DISPLAY]?.label ?? sourceNetwork : null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Países principales de la audiencia</Typography>
      {!networkCode && sourceLabel && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Datos de {sourceLabel} — otras redes conectadas pueden no exponer este dato todavía.
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={50} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as (typeof data)[number];
              return (
                <Box sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25, boxShadow: 1 }}>
                  <Typography variant="caption" fontWeight={700} display="block">{countryLabel(point.country)}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">Audiencia: {point.value.toLocaleString()}</Typography>
                </Box>
              );
            }}
          />
          <Bar dataKey="value" name="Audiencia" fill="#E0A800" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
