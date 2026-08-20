'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useActiveBrandId } from './useActiveBrandId';
import { useDateRangeParams } from './useDateRangeParams';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

const GENDER_LABEL: Record<string, string> = { F: 'Mujer', M: 'Hombre', U: 'Sin especificar' };
const GENDER_COLOR: Record<string, string> = { F: '#E0A800', M: '#1565C0', U: '#9E9E9E' };

// Datos reales — confirmado en vivo contra Ayrshare que el shape es
// { "F.25-34": 15, "M.18-24": 11, ... } (género.rango unidos por punto).
// Barras apiladas por rango de edad, una serie por género — más legible que
// un histograma plano cuando también hay género (sugerencia del usuario).
// Requiere que Instagram haya liberado el dato (≥100 interacciones en 30
// días) — mientras no, esta cuenta muestra el estado vacío honesto de abajo.
// Solo Instagram expone este cruce edad×género hoy (TikTok da 2 arrays
// separados, sin equivalente real — ver account-metrics-mapper.registry.ts
// en el backend), así que en la práctica sourceNetwork siempre será
// 'instagram' mientras eso no cambie — se etiqueta igual por si un día deja
// de serlo, en vez de asumirlo hardcodeado.
export function AudienceGenderAgeChart({ networkCode }: { networkCode?: string } = {}) {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const { data: history = [], isFetching: loadingHistory } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });

  const { data, genders, sourceNetwork } = useMemo(() => {
    const scoped = networkCode ? history.filter((p) => p.socialAccount.socialNetwork.code === networkCode) : history;
    const latestWithData = [...scoped].reverse().find((p) => p.audienceGenderAge);
    if (!latestWithData?.audienceGenderAge) return { data: [], genders: [], sourceNetwork: null as string | null };

    const byAgeRange = new Map<string, Record<string, number>>();
    const genderSet = new Set<string>();
    for (const [key, value] of Object.entries(latestWithData.audienceGenderAge)) {
      const [gender, ageRange] = key.split('.');
      if (!gender || !ageRange) continue;
      genderSet.add(gender);
      const row = byAgeRange.get(ageRange) ?? {};
      row[gender] = value;
      byAgeRange.set(ageRange, row);
    }
    const rows = Array.from(byAgeRange.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ageRange, values]) => ({ ageRange, ...values }));
    return { data: rows, genders: Array.from(genderSet), sourceNetwork: latestWithData.socialAccount.socialNetwork.code };
  }, [history, networkCode]);

  if (!brandId) return null;

  if (loadingHistory) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Audiencia por edad y género</Typography>
        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Audiencia por edad y género</Typography>
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
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Audiencia por edad y género</Typography>
      {!networkCode && sourceLabel && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Datos de {sourceLabel} — otras redes conectadas pueden no exponer este dato todavía.
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
          <XAxis dataKey="ageRange" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <RechartsTooltip />
          <Legend />
          {genders.map((g) => (
            <Bar key={g} dataKey={g} name={GENDER_LABEL[g] ?? g} stackId="gender" fill={GENDER_COLOR[g] ?? '#9E9E9E'} radius={g === genders[genders.length - 1] ? [4, 4, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
