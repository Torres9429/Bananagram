'use client';

import Paper from '@mui/material/Paper';
import { EmptyState } from '@repo/ui/ui';

// Fase Q: sin mock. El backend solo calcula un topPost por campaña
// (campaign-metrics.service.ts) — no un ranking de N publicaciones, que es
// lo que este widget necesita. Ver la comparación de campañas (más abajo en
// General) para el único post destacado que sí es real.
export function TopContent() {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <EmptyState
        title="Publicaciones destacadas — pendiente"
        description="El backend calcula solo la mejor publicación por campaña (ver Comparación de campañas), no un ranking completo todavía."
      />
    </Paper>
  );
}
