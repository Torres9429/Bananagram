'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { selectEngagementTimeSeries } from '../../store/analytics.selectors';

/**
 * "Gráfica principal" (§B.2 del rediseño de dominio) — misma estructura en las 7
 * pestañas (General + 6 redes). Extraído del bloque que antes vivía inline en
 * metrics/page.tsx solo para "Resumen"; reutiliza selectEngagementTimeSeries tal
 * cual, que ya respeta selectedNetwork vía selectFilteredMetricFacts — sin
 * recalcular nada aquí, solo centraliza el render para no duplicarlo por pestaña.
 */
export function EngagementChart() {
  const engagementSeries = useSelector(selectEngagementTimeSeries);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Engagement en el periodo filtrado</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={engagementSeries}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <RechartsTooltip />
          <Line type="monotone" dataKey="value" stroke="#E0A800" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
