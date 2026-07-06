'use client';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';

export type PrimaryButtonProps = Omit<ButtonProps, 'variant' | 'color'>;

export function PrimaryButton({ sx, ...props }: PrimaryButtonProps) {
  return (
    <Button
      variant="contained"
      sx={[
        {
          bgcolor: '#E0A800',
          color: '#FFFFFF',
          '&:hover': { bgcolor: '#D4AC40' },
          '&:disabled': { bgcolor: '#E8E8E8', color: '#AAAAAA' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
}
