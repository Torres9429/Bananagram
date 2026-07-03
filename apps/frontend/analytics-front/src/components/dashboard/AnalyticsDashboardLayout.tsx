'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

interface AnalyticsDashboardLayoutProps {
  /** Fila de KPIs (Grid items ya armados, ej. <Grid item xs={12} md={3}><TrendCard .../></Grid>) */
  kpiRow: ReactNode;
  /**
   * Slot abierto para futuras secciones del dashboard (gráficas, tablas, timeline,
   * heatmap, insights, comparadores). Vacío en esta fase — solo se define el shell.
   */
  children?: ReactNode;
}

/**
 * Shell de layout del Centro de Inteligencia de Redes Sociales.
 * No contiene lógica de datos ni de filtros — solo estructura, para que las
 * fases siguientes puedan agregar widgets sin reorganizar el layout.
 */
export function AnalyticsDashboardLayout({ kpiRow, children }: AnalyticsDashboardLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={2}>
        {kpiRow}
      </Grid>
      {children}
    </Box>
  );
}
