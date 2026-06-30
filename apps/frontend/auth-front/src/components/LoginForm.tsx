'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { LabeledField } from '@repo/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, findUserByCredentials, buildTokenFromUser, setCookieToken } from '@repo/ui';

const WEB_SHELL_DASHBOARD_URL = 'http://localhost:3000/dashboard';

export function LoginForm() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    console.info(
      '%cCuentas de prueba (solo desarrollo)',
      'font-weight:bold; color:#7A5C00',
      '\n  admin@bananagram.mx / admin123',
      '\n  cm@bananagram.mx / cm123456',
      '\n  disenador@bananagram.mx / diseno123',
      '\n  cliente@bananagram.mx / cliente123',
    );
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = findUserByCredentials(email, password);
    if (!user) {
      setError(true);
      return;
    }
    setError(false);
    const token = buildTokenFromUser(user);
    // La cookie es accesible desde todos los microfronts (mismo host, distintos puertos).
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    window.location.href = WEB_SHELL_DASHBOARD_URL;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        Bienvenido...
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Inicia sesión en tu cuenta
      </Typography>

      <LabeledField
        label="Correo electrónico:"
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.
        </Alert>
      )}

      <Button
        type="submit"
        fullWidth
        size="large"
        sx={{
          mt: 1, mb: 2, py: 1.25,
          color: '#fff', fontWeight: 700,
          background: '#FDC726',
          '&:hover': { background: '#D4AC40' },
        }}
      >
        Ingresar
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" component={Link} href="/forgot-password" sx={{ textDecoration: 'none' }}>
          ¿Olvidaste tu contraseña?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ¿Eres Cliente?{' '}
          <Box component={Link} href="/register" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }}>
            Crea tu cuenta
          </Box>
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        ¿Eres CM o Diseñador? Activa tu cuenta desde el enlace que te enviaron por correo.
      </Typography>
    </Box>
  );
}
