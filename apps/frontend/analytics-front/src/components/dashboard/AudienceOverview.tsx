'use client';

import Paper from '@mui/material/Paper';
import { EmptyState } from '@repo/ui/ui';

// Fase Q: sin mock. Crecimiento de audiencia, publicaciones/semana y
// retención de video dependen de histórico o de métricas nativas por red que
// no capturamos hoy (mismos motivos que EngagementChart/NetworkMetricCards).
export function AudienceOverview() {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <EmptyState
        title="Resumen de audiencia — pendiente"
        description="Crecimiento de seguidores y retención de video necesitan histórico y métricas nativas que todavía no capturamos."
      />
    </Paper>
  );
}
