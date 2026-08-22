import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { BadgeTone, BadgeProps } from '../../../interfaces/interface';

const DOT_COLOR: Record<BadgeTone, string> = {
  neutral: 'text.secondary',
  info: 'info.main',
  success: 'success.main',
  warning: 'warning.main',
};

/** Pill de estado (punto + texto) usado en el timeline de Publicaciones. Colores derivados 100% de palette.*.main. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: DOT_COLOR[tone], flexShrink: 0 }} />
      <Typography variant="caption" fontWeight={600} color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
