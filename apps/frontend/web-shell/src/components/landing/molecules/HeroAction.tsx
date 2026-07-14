'use client';

import Stack from '@mui/material/Stack';
import { LandingButton } from '../atoms/LandingButton';

export interface HeroActionProps {
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export function HeroAction({ onPrimaryClick, onSecondaryClick }: HeroActionProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
      <LandingButton variant="primary" onClick={onPrimaryClick}>
        Comenzar
      </LandingButton>
      <LandingButton variant="secondary" onClick={onSecondaryClick}>
        Solicitar demo
      </LandingButton>
    </Stack>
  );
}
