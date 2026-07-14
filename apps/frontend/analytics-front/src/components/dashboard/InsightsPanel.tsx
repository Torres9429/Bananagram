'use client';

import { useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, InsightCard } from '@repo/ui/ui';
import { selectInsights } from '../../store/analytics.selectors';

/**
 * Insights deterministas (computeInsights, Fase 4) — generados enteramente en el
 * engine; este componente solo renderiza. Reutiliza InsightCard (@repo/ui, creado
 * en Fase 1 y sin uso hasta ahora).
 */
export function InsightsPanel() {
  const insights = useSelector(selectInsights);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Insights automáticos</Typography>
      {insights.length === 0 ? (
        <EmptyState title="Sin insights por ahora" description="No se detectaron patrones relevantes con los filtros activos." />
      ) : (
        <Stack gap={1.5}>
          {insights.map((insight) => (
            <InsightCard key={insight.id} severity={insight.severity} title={insight.title} description={insight.description} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
