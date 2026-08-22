'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { PasswordField } from './PasswordField';

// useSearchParams se usa SOLO para leer el token del enlace de reset (mismo
// patrón que ActivateForm.tsx lee `?email=`) — no es sesión. El token
// corresponde a PasswordResetToken.token (UUID enviado por correo), no al
// JWT de sesión.
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="error" mb={1}>Enlace inválido</Typography>
        <Typography variant="body2" color="text.secondary">
          Este enlace para restablecer contraseña no es válido o ya fue utilizado. Solicita uno nuevo desde
          la pantalla de inicio de sesión.
        </Typography>
      </Box>
    );
  }

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
          background: '#E0A800',
          '&:hover': { background: '#D4AC40' },
        }}
      >
        Restablecer contraseña
      </Button>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        <Box component={Link} href="/login" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver a inicio de sesión
        </Box>
      </Typography>
    </Box>
  );
}
