'use client';

import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { LabeledField } from './LabeledField';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Diseño sin backend: no se consume ninguna API todavía.
    // Cuando exista el endpoint, reemplazar por useForgotPasswordMutation de
    // @repo/ui (api/auth.api.ts) -> POST auth/forgot-password { email }.
    setSent(true);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        ¿Olvidaste tu contraseña?
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Te enviaremos un enlace para restablecerla
      </Typography>

      {sent && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Si el correo existe, recibirás un enlace para restablecer tu contraseña.
        </Alert>
      )}

      <LabeledField
        label="Correo electrónico:"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={sent}
      />

      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={sent}
        sx={{
          mt: 1,
          mb: 2,
          py: 1.25,
          color: '#fff',
          fontWeight: 700,
          background: '#FDC726',
          '&:hover': { background: '#D4AC40' },
        }}
      >
        Enviar enlace
      </Button>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        <Box component={Link} href="/login" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver a inicio de sesión
        </Box>
      </Typography>
    </Box>
  );
}
