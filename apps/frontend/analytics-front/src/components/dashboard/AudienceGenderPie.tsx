'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useActiveBrandId } from './useActiveBrandId';
import { useDateRangeParams } from './useDateRangeParams';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

const GENDER_LABEL: Record<string, string> = { F: 'Mujer', M: 'Hombre', U: 'Sin especificar' };
const GENDER_COLOR: Record<string, string> = { F: '#E0A800', M: '#1565C0', U: '#9E9E9E' };

// Mismo dato que AudienceGenderAgeChart, sumado por género (sin desglose de
// edad) — vista rápida de proporción, sin backend nuevo.
export function AudienceGenderPie({ networkCode }: { networkCode?: string } = {}) {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const { data: history = [], isFetching: loadingHistory } = useGetBrandMetricsHistoryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });

  const { data, sourceNetwork } = useMemo(() => {
    const scoped = networkCode ? history.filter((p) => p.socialAccount.socialNetwork.code === networkCode) : history;
    const latestWithData = [...scoped].reverse().find((p) => p.audienceGenderAge);
    if (!latestWithData?.audienceGenderAge) return { data: [], sourceNetwork: null as string | null };
    const byGender = new Map<string, number>();
    for (const [key, value] of Object.entries(latestWithData.audienceGenderAge)) {
      const gender = key.split('.')[0];
      if (!gender) continue;
      byGender.set(gender, (byGender.get(gender) ?? 0) + value);
    }
    const rows = Array.from(byGender.entries()).map(([gender, value]) => ({ gender, label: GENDER_LABEL[gender] ?? gender, value }));
    return { data: rows, sourceNetwork: latestWithData.socialAccount.socialNetwork.code };
  }, [history, networkCode]);

  if (!brandId) return null;

  if (loadingHistory) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Distribución de género</Typography>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Distribución de género</Typography>
        <EmptyState title="Sin demografía disponible todavía" />
      </Paper>
    );
  }

  const sourceLabel = sourceNetwork ? NETWORK_DISPLAY[sourceNetwork as keyof typeof NETWORK_DISPLAY]?.label ?? sourceNetwork : null;

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Distribución de género</Typography>
      {!networkCode && sourceLabel && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Datos de {sourceLabel}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} label={(entry) => `${entry.label} (${entry.value}%)`}>
            {data.map((entry) => (
              <Cell key={entry.gender} fill={GENDER_COLOR[entry.gender] ?? '#9E9E9E'} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
