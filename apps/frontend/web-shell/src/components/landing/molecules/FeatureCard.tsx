import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { FeatureCardProps } from '../../../interfaces/interface';

/** Tarjeta ícono+título+descripción+visual opcional, usada por Campañas/Publicaciones/Calendario/Colaboración. */
export function FeatureCard({ icon, title, description, visual, tone = 'primary' }: FeatureCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        p: 3,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflow: 'hidden',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        '&:hover .feature-card-underline': { transform: 'scaleX(1)' },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: `${tone}.light`,
          color: `${tone}.dark`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {visual && <Box sx={{ mt: 'auto', pt: 1 }}>{visual}</Box>}

      <Box
        className="feature-card-underline"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          height: 3,
          borderRadius: 999,
          bgcolor: `${tone}.main`,
          transform: 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 0.25s ease',
        }}
      />
    </Paper>
  );
}
