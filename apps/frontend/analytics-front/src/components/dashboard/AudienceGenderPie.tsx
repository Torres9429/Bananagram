'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const GENDER_LABEL: Record<string, string> = { F: 'Mujer', M: 'Hombre', U: 'Sin especificar' };
const GENDER_COLOR: Record<string, string> = { F: '#E0A800', M: '#1565C0', U: '#9E9E9E' };

// Mismo dato que AudienceGenderAgeChart, sumado por género (sin desglose de
// edad) — vista rápida de proporción, sin backend nuevo.
export function AudienceGenderPie() {
  const campaigns = useFilteredCampaigns();
  const brandId = campaigns[0]?.brandId;
  const { data: history = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId } : ({} as never), { skip: !brandId });

  const data = useMemo(() => {
    const latestWithData = [...history].reverse().find((p) => p.audienceGenderAge);
    if (!latestWithData?.audienceGenderAge) return [];
    const byGender = new Map<string, number>();
    for (const [key, value] of Object.entries(latestWithData.audienceGenderAge)) {
      const gender = key.split('.')[0];
      if (!gender) continue;
      byGender.set(gender, (byGender.get(gender) ?? 0) + value);
    }
    return Array.from(byGender.entries()).map(([gender, value]) => ({ gender, label: GENDER_LABEL[gender] ?? gender, value }));
  }, [history]);

  if (!brandId) return null;

  if (data.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Distribución de género</Typography>
        <EmptyState title="Sin demografía disponible todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Distribución de género</Typography>
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
