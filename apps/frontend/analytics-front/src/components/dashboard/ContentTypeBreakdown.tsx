'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState } from '@repo/ui/ui';
import { useFilteredCampaignsResult } from './useFilteredCampaigns';

const TYPE_LABEL: Record<string, string> = { imagen: 'Imagen', video: 'Video', carrusel: 'Carrusel', sin_media: 'Solo texto' };
const TYPE_COLOR: Record<string, string> = { imagen: '#E0A800', video: '#1565C0', carrusel: '#2E7D32', sin_media: '#9E9E9E' };

// Datos reales, propios (Post.media.mimeType, nunca de Ayrshare) — 0 adjuntos
// = solo texto, 1 = imagen o video según mimeType, 2+ = carrusel.
export function ContentTypeBreakdown() {
  const { campaigns, isLoading } = useFilteredCampaignsResult();

  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const campaign of campaigns) {
      for (const item of campaign.contentTypeBreakdown) {
        totals.set(item.type, (totals.get(item.type) ?? 0) + item.count);
      }
    }
    return Array.from(totals.entries()).map(([type, count]) => ({ type, label: TYPE_LABEL[type] ?? type, count }));
  }, [campaigns]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Skeleton variant="text" width={320} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Paper>
    );
  }

  if (total === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin publicaciones todavía" />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Tipo de contenido publicado (campañas en Bananagram)</Typography>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={(entry) => `${entry.label} (${entry.count})`}>
            {data.map((entry) => (
              <Cell key={entry.type} fill={TYPE_COLOR[entry.type] ?? '#9E9E9E'} />
            ))}
          </Pie>
          <RechartsTooltip />
          <Legend wrapperStyle={{ paddingTop: '40px' }} />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
