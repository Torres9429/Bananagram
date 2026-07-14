'use client';

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import type { TextFieldProps } from '@mui/material/TextField';
import { LabeledField } from '@repo/ui/ui';

interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'label'> {
  label?: string;
}

export function PasswordField({ label = 'Contraseña', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <LabeledField
      label={label}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setVisible((v) => !v)}
              edge="end"
              tabIndex={-1}
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {visible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}
