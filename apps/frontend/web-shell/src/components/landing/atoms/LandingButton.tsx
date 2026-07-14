'use client';

import Button, { type ButtonProps } from '@mui/material/Button';
import { PrimaryButton } from '@repo/ui/ui';

export type LandingButtonVariant = 'primary' | 'secondary';

export interface LandingButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  variant?: LandingButtonVariant;
}

/** Punto de entrada único de botones para la Landing: `primary` reutiliza PrimaryButton de @repo/ui, `secondary` es un outlined derivado 100% del theme. */
export function LandingButton({ variant = 'primary', size = 'large', sx, ...props }: LandingButtonProps) {
  const sxArray = Array.isArray(sx) ? sx : [sx];

  if (variant === 'primary') {
    return <PrimaryButton size={size} sx={[{ borderRadius: 999, px: 4 }, ...sxArray]} {...props} />;
  }

  return (
    <Button
      variant="outlined"
      color="primary"
      size={size}
      sx={[
        { borderRadius: 999, px: 4, borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
        ...sxArray,
      ]}
      {...props}
    />
  );
}
