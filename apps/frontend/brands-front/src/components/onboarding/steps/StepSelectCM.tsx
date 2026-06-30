'use client';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAvailableCMsForCategory, type MockAvailableCM } from '../../../lib/mock-data';

interface Props {
  category: string;
  selectedCMId: string | null;
  onChange: (cm: MockAvailableCM) => void;
}

export function StepSelectCM({ category, selectedCMId, onChange }: Props) {
  const cms = getAvailableCMsForCategory(category);

  return (
    <Stack gap={2}>
      <Typography variant="caption" color="text.secondary">
        Selecciona el Community Manager que coordinará tu campaña.
        Los CM con categorías afines aparecen primero.
      </Typography>

      {cms.map((cm) => {
        const isSelected = selectedCMId === cm.id;
        const matches = cm.categories.includes(category);
        return (
          <Paper
            key={cm.id}
            elevation={0}
            onClick={() => onChange(cm)}
            sx={{
              border: `2px solid ${isSelected ? '#FDC726' : '#E8E8E8'}`,
              borderRadius: 3,
              p: 2,
              cursor: 'pointer',
              bgcolor: isSelected ? '#FFF8E1' : '#fff',
              position: 'relative',
              '&:hover': { borderColor: '#FDC726' },
            }}
          >
            <Stack direction="row" gap={2} alignItems="center">
              <Avatar sx={{ bgcolor: cm.avatarBg, color: cm.avatarColor, width: 44, height: 44, fontWeight: 700 }}>
                {cm.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="body2" fontWeight={700}>{cm.name}</Typography>
                  {matches && (
                    <Chip label="Recomendado" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontSize: 10 }} />
                  )}
                </Stack>
                <Stack direction="row" gap={0.75} mt={0.5} flexWrap="wrap">
                  {cm.categories.map((cat) => (
                    <Chip key={cat} label={cat} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Equipo: {cm.designers.map((d) => d.name).join(', ') || 'Sin diseñadores asignados aún'}
                </Typography>
              </Box>
              {isSelected && (
                <CheckCircleIcon sx={{ color: '#FDC726', fontSize: 24 }} />
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
