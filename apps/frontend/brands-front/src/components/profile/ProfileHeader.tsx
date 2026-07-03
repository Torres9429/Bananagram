'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';

interface ProfileHeaderProps {
  name: string;
  subtitle: string;
}

// Encabezado común de ProfilePage (§2 del rediseño de dominio) — identidad
// básica compartida por cualquier tipo de perfil. El contenido específico de
// cada rol vive en su sección (ClientSection / StaffProfileSection), nunca aquí.
export function ProfileHeader({ name, subtitle }: ProfileHeaderProps) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" gap={2}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: '#FFF8E1', color: '#7A5C00', fontSize: 24, fontWeight: 700 }}>
          {initials || '—'}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={700}>{name || 'Sin nombre'}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}
