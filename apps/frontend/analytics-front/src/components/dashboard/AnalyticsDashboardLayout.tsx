import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import type { AnalyticsDashboardLayoutProps } from '../../interfaces/interface';

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
