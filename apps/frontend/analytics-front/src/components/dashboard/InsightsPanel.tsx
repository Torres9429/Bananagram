'use client';

import Paper from '@mui/material/Paper';
import { EmptyState } from '@repo/ui/ui';

// Fase Q: sin mock. Los 4 insights (mejor red, delta de alcance semana
// contra semana, campaña top por seguidores, mejor hora de publicar)
// dependen todos de histórico o de datos que el backend no calcula todavía.
export function InsightsPanel() {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <EmptyState
        title="Insights automáticos — pendiente"
        description="Los insights (comparativas semana contra semana, mejor hora de publicar) requieren histórico de métricas, que todavía no capturamos."
      />
    </Paper>
  );
}
