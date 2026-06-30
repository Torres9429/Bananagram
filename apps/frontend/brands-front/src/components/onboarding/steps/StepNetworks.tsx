'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { AVAILABLE_SOCIAL_NETWORKS, type SocialNetworkCode } from '../../../lib/mock-data';

interface Props {
  selected: SocialNetworkCode[];
  onChange: (codes: SocialNetworkCode[]) => void;
}

export function StepNetworks({ selected, onChange }: Props) {
  function toggle(code: SocialNetworkCode) {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  }

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
          Selecciona las redes donde publicarás
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Cada red generará un perfil independiente (BrandProfile). Puedes agregar más después.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {AVAILABLE_SOCIAL_NETWORKS.map((net) => {
          const active = selected.includes(net.code);
          return (
            <Chip
              key={net.code}
              label={net.label}
              onClick={() => toggle(net.code)}
              sx={{
                px: 2,
                py: 3,
                fontSize: 14,
                fontWeight: 600,
                border: `2px solid ${active ? net.color : '#E8E8E8'}`,
                bgcolor: active ? `${net.color}18` : '#fff',
                color: active ? net.color : '#6B6B6B',
                cursor: 'pointer',
                '&:hover': { borderColor: net.color, bgcolor: `${net.color}10` },
                height: 'auto',
              }}
            />
          );
        })}
      </Box>

      {selected.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Selecciona al menos una red social para continuar.
        </Alert>
      )}

      {selected.length > 0 && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {selected.length} {selected.length === 1 ? 'red seleccionada' : 'redes seleccionadas'}.
          Se crearán {selected.length} perfiles de publicación.
        </Alert>
      )}
    </Stack>
  );
}
