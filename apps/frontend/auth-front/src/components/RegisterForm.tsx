'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { LabeledField } from '@repo/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, findUserByEmail, buildTokenFromUser, setCookieToken } from '@repo/ui';

// Mock: el registro usa la cuenta demo de Cliente.
// Backend: POST /auth/register { name, email, password } → JWT real.
const MOCK_CLIENT_EMAIL = 'cliente@bananagram.mx';
const BRANDS_FRONT_ONBOARDING_URL = 'http://localhost:3013/onboarding';

export function RegisterForm() {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

    const mockUser = findUserByEmail(MOCK_CLIENT_EMAIL);
    if (!mockUser) return;

    const token = buildTokenFromUser(mockUser);
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    setSubmitted(true);

    window.location.href = BRANDS_FRONT_ONBOARDING_URL;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Crea tu cuenta
        </Typography>
        <Chip label="Cliente" size="small" sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 700 }} />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Registra tu marca y comienza a gestionar contenido
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {submitted && <Alert severity="success" sx={{ mb: 2 }}>Cuenta creada. Configurando tu perfil…</Alert>}

      <LabeledField label="Nombre completo:" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitted} />
      <LabeledField label="Correo electrónico:" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitted} />
      <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required disabled={submitted} />
      <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} required disabled={submitted} />

      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={submitted}
        sx={{ mt: 1, mb: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#FDC726', '&:hover': { background: '#D4AC40' } }}
      >
        Crear cuenta
      </Button>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        ¿Ya tienes una cuenta?{' '}
        <Box component={Link} href="/login" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }}>
          Inicia sesión
        </Box>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        ¿Eres CM o Diseñador? Tu cuenta la crea el Administrador — actívala desde el correo que recibiste.
      </Typography>
    </Box>
  );
}
