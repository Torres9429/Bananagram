'use client';

import Paper from '@mui/material/Paper';
import { EmptyState } from '@repo/ui/ui';

// Fase Q: sin mock. Estos campos (saves, watch time, CTR, respuestas a
// historias, etc.) son nativos de cada red — Ayrshare los expone, pero
// nuestros mappers (integrations/ayrshare/mappers/*.mapper.ts) solo leen
// likes/comments/shares/views/reach hoy. Capturarlos es trabajo de backend
// nuevo, fuera de esta fase.
export function NetworkMetricCards() {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <EmptyState
        title="Métricas nativas de la red — pendientes"
        description="Guardados, tiempo de reproducción, CTR y otros campos específicos de cada red no se capturan todavía del lado del backend."
      />
    </Paper>
  );
}
