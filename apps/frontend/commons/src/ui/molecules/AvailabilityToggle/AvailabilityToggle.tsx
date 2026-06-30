'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import CircleIcon from '@mui/icons-material/Circle';

type Availability = 'disponible' | 'no_disponible';

interface AvailabilityToggleProps {
  value: Availability;
  onChange: (v: Availability) => void;
  disabled?: boolean;
}

export function AvailabilityToggle({ value, onChange, disabled }: AvailabilityToggleProps) {
  const isAvailable = value === 'disponible';

  return (
    <Stack direction="row" alignItems="center" gap={1.5}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
        Disponibilidad:
      </Typography>
      <Switch
        checked={isAvailable}
        disabled={disabled}
        onChange={(_, checked) => onChange(checked ? 'disponible' : 'no_disponible')}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#FDC726' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#FDC726' },
        }}
      />
      <Chip
        size="small"
        icon={<CircleIcon sx={{ fontSize: '10px !important', color: isAvailable ? '#2E7D32' : '#9E9E9E' }} />}
        label={isAvailable ? 'Disponible' : 'No disponible'}
        sx={{
          bgcolor: isAvailable ? '#E8F5E9' : '#F5F5F5',
          color: isAvailable ? '#2E7D32' : '#757575',
          fontWeight: 600,
        }}
      />
    </Stack>
  );
}
