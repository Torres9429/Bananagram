'use client';

import Paper from '@mui/material/Paper';
import { EmptyState } from '@repo/ui/ui';

// Fase Q: sin mock. No existe un endpoint "métricas de un solo post" — el
// backend solo agrega por campaña/red (campaign-metrics.service.ts) y
// calcula un único topPost por campaña, no el detalle de un post cualquiera.
export function SelectedPostDetail() {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <EmptyState
        title="Detalle de publicación — pendiente"
        description="Todavía no existe un endpoint que devuelva las métricas de una publicación específica, solo agregados por campaña."
      />
    </Paper>
  );
}
