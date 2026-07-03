'use client';

// LEGACY/DEPRECATED (dominio v3): step de OnboardingWizard, que ya no forma
// parte de ningún flujo alcanzable (ver OnboardingWizard.tsx) — el registro
// (auth-front/RegisterForm.tsx) ya captura tipo/nombre/categoría de perfil
// directamente. Se conserva sin borrar por si se reutiliza más adelante.
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MenuItem from '@mui/material/MenuItem';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { LabeledField, LabeledSelect } from '@repo/ui';
import { MOCK_CATEGORIES } from '../../../lib/mock-data';
import type { ProfileType } from '../../../lib/mock-data';

export interface ProfileDraft {
  name: string;
  type: ProfileType;
  category: string;
}

interface Props {
  value: ProfileDraft;
  onChange: (v: ProfileDraft) => void;
}

export function StepProfile({ value, onChange }: Props) {
  return (
    <Stack gap={3}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
          ¿Qué tipo de perfil vas a gestionar?
        </Typography>
        <ToggleButtonGroup
          value={value.type}
          exclusive
          onChange={(_, v) => v && onChange({ ...value, type: v })}
          sx={{ gap: 1.5, display: 'flex' }}
        >
          <ToggleButton
            value="brand"
            sx={{
              flex: 1,
              py: 2,
              border: '1px solid #E8E8E8 !important',
              borderRadius: '12px !important',
              flexDirection: 'column',
              gap: 0.75,
              '&.Mui-selected': { bgcolor: '#FFF8E1', borderColor: '#E0A800 !important', color: '#7A5C00' },
            }}
          >
            <BusinessOutlinedIcon />
            <Typography variant="body2" fontWeight={600}>Marca</Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.7, textTransform: 'none' }}>
              Nike, Zara, Starbucks…
            </Typography>
          </ToggleButton>
          <ToggleButton
            value="personal"
            sx={{
              flex: 1,
              py: 2,
              border: '1px solid #E8E8E8 !important',
              borderRadius: '12px !important',
              flexDirection: 'column',
              gap: 0.75,
              '&.Mui-selected': { bgcolor: '#FFF8E1', borderColor: '#E0A800 !important', color: '#7A5C00' },
            }}
          >
            <PersonOutlineOutlinedIcon />
            <Typography variant="body2" fontWeight={600}>Perfil personal</Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.7, textTransform: 'none' }}>
              Dr. Juan Pérez, @influencer…
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <LabeledField
        label={value.type === 'brand' ? 'Nombre de la marca:' : 'Nombre del perfil:'}
        placeholder={value.type === 'brand' ? 'Ej. Nike México' : 'Ej. Dra. María López'}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        required
      />

      <LabeledSelect
        label="Categoría:"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value as string })}
        displayEmpty
      >
        <MenuItem value="" disabled><em>Selecciona una categoría</em></MenuItem>
        {MOCK_CATEGORIES.map((c) => (
          <MenuItem key={c} value={c}>{c}</MenuItem>
        ))}
      </LabeledSelect>
    </Stack>
  );
}
