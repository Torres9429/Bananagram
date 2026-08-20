'use client';

import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { EmptyState, ChartTitle } from '@repo/ui/ui';
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
      <ChartTitle
        title="Tipo de contenido publicado"
        description="Cuántas publicaciones de cada tipo, en las campañas visibles."
        info="Imagen: 1 foto. Video: 1 clip. Carrusel: 2 o más archivos en la misma publicación. Solo texto: sin ninguna imagen o video adjunto."
      />
      {/* Bug real: las etiquetas de la torta se dibujan FUERA del radio
          (comportamiento default de Recharts) — con outerRadius:80 y
          height:240 la etiqueta de arriba no tenía espacio y quedaba
          cortada contra el borde del contenedor. margin+height+radio
          más chico le dan el aire que falta. */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart margin={{ top: 24, right: 8, bottom: 0, left: 8 }}>
          <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={(entry) => `${entry.label} (${entry.count})`}>
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
