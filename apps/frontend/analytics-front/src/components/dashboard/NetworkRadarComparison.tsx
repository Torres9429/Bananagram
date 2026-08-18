'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { useFilteredCampaigns } from './useFilteredCampaigns';

const METRICS: { key: 'likes' | 'comments' | 'shares' | 'views' | 'reach'; label: string }[] = [
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'views', label: 'Vistas' },
  { key: 'reach', label: 'Alcance' },
];

// Datos reales, sin backend nuevo — reusa byNetwork (ya agregado por
// campaign-metrics.service.ts). Normalizado 0-100 por métrica (cada eje
// tiene escalas muy distintas — alcance en miles, comentarios en decenas —
// sin normalizar, un radar sin escalar haría invisibles las métricas chicas).
export function NetworkRadarComparison() {
  const campaigns = useFilteredCampaigns();

  const { data, networkCodes } = useMemo(() => {
    const totals = new Map<string, Record<string, number>>();
    for (const campaign of campaigns) {
      for (const network of campaign.byNetwork) {
        const row = totals.get(network.networkCode) ?? { likes: 0, comments: 0, shares: 0, views: 0, reach: 0 };
        row.likes += network.likes;
        row.comments += network.comments;
        row.shares += network.shares;
        row.views += network.views;
        row.reach += network.reach;
        totals.set(network.networkCode, row);
      }
    }
    const codes = Array.from(totals.keys());
    const maxByMetric = new Map(METRICS.map((m) => [m.key, Math.max(1, ...codes.map((c) => totals.get(c)![m.key]))]));
    const rows = METRICS.map((m) => {
      const row: Record<string, number | string> = { metric: m.label };
      for (const code of codes) {
        row[code] = Math.round((totals.get(code)![m.key] / maxByMetric.get(m.key)!) * 100);
      }
      return row;
    });
    return { data: rows, networkCodes: codes };
  }, [campaigns]);

  if (networkCodes.length < 2) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Se necesitan al menos 2 redes con datos" description="Conecta y publica en más de una red para comparar." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Comparativa de redes (radar)</Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Cada métrica normalizada 0-100 contra la red que más tiene — para comparar forma, no volumen absoluto.
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#E8E8E8" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <RechartsTooltip />
          <Legend />
          {networkCodes.map((code) => (
            <Radar
              key={code}
              name={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code}
              dataKey={code}
              stroke={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'}
              fill={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.color ?? '#9E9E9E'}
              fillOpacity={0.15}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
