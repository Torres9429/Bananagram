'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useActiveBrandId } from './useActiveBrandId';

// Datos reales — confirmado en vivo, shape { "US": 161, ... } (código de
// país, no nombre completo — Ayrshare no lo traduce). Top 8 países.
export function AudienceCountryChart() {
  const brandId = useActiveBrandId();
  const { data: history = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId } : ({} as never), { skip: !brandId });

  const data = useMemo(() => {
    const latestWithData = [...history].reverse().find((p) => p.audienceCountry);
    if (!latestWithData?.audienceCountry) return [];
    return Object.entries(latestWithData.audienceCountry)
      .map(([country, value]) => ({ country, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [history]);

  if (!brandId) return null;

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

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Países principales de la audiencia</Typography>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={50} />
          <RechartsTooltip />
          <Bar dataKey="value" name="Audiencia" fill="#E0A800" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
