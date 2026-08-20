import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface WidgetCardProps {
  icon: ReactNode;
  label: string;
  /** null = sin permiso/sin dato, se muestra como '—' (mismo criterio que MetricCard) */
  value: string | number | null;
  /** Color de fondo del ícono — por defecto usa primary-light */
  iconBg?: string;
  iconColor?: string;
  /** Elemento adicional renderizado debajo del valor (ej. sparkline, chip) */
  addon?: ReactNode;
}

export function WidgetCard({
  icon,
  label,
  value,
  iconBg = '#FFF8E1',
  iconColor = 'primary.contrastTextMuted',
  addon,
}: WidgetCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: iconBg, color: iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} noWrap>{value === null ? '—' : value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {addon && <Box sx={{ mt: 0.75 }}>{addon}</Box>}
        </Box>
      </Stack>
    </Paper>
  );
}
