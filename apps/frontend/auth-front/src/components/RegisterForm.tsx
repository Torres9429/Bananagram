'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { LabeledField } from './LabeledField';
import { PasswordField } from './PasswordField';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    // Consumo de API (pendiente): useRegisterMutation de @repo/ui (api/auth.api.ts)
    // -> POST auth/register { name, email, password } (falta implementar el endpoint en auth-service)
    // Diseño sin backend: simulamos éxito y mandamos al login.
    setSubmitted(true);
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        Crea tu cuenta
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Únete al equipo de Bananagram
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {submitted && <Alert severity="success" sx={{ mb: 2 }}>Cuenta creada. Redirigiendo a inicio de sesión…</Alert>}

      <LabeledField label="Nombre completo:" value={name} onChange={(e) => setName(e.target.value)} required />
      <LabeledField
        label="Correo electrónico:"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required />
      <PasswordField
        label="Confirmar contraseña:"
        value={confirmPassword}
        placeholder="●●●●●●●●●"
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <Button
        type="submit"
        fullWidth
        size="large"
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
        Crear cuenta
      </Button>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        ¿Ya tienes una cuenta?{' '}
        <Box component={Link} href="/login" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }}>
          Inicia sesión
        </Box>
      </Typography>
    </Box>
  );
}
