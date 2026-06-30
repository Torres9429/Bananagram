'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { PasswordField } from './PasswordField';

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    // Diseño sin backend: no se consume ninguna API todavía.
    // Cuando exista el endpoint, reemplazar por useResetPasswordMutation de
    // @repo/ui (api/auth.api.ts) -> POST auth/reset-password { token, password }.
    setDone(true);
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        Restablecer contraseña
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Crea una nueva contraseña para tu cuenta
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {done && <Alert severity="success" sx={{ mb: 2 }}>Contraseña actualizada. Redirigiendo a inicio de sesión…</Alert>}

      <PasswordField label="Nueva contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required disabled={done} />
      <PasswordField
        label="Confirmar contraseña:"
        value={confirmPassword}
        placeholder="●●●●●●●●●"
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={done}
      />

      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={done}
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
        Restablecer contraseña
      </Button>
    </Box>
  );
}
