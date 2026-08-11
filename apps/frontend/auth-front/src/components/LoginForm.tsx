'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { LabeledField } from '@repo/ui/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, setCookieToken, setRefreshCookieToken, useLoginMutation, decodeJwt } from '@repo/ui/state';
import { theme } from '@repo/ui/theme';
import { getPostAuthDestination } from '@repo/ui/utils';

export function LoginForm() {
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    console.info(
      '%cCuentas de prueba (seed real, apps/backend)',
      `font-weight:bold; color:${theme.palette.primary.contrastTextMuted}`,
      '\n  admin@bananagram.mx / admin123',
      '\n  cm@bananagram.mx / cm123456',
      '\n  disenador@bananagram.mx / diseno123',
      '\n  cliente@bananagram.mx / cliente123',
      '\n  alex@bananagram.mx / alex12345 (Cliente, perfil personal)',
      '\n  multi@bananagram.mx / multi12345 (CM + Diseñador, multi-rol)',
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    try {
      const { accessToken, refreshToken } = await login({ email, password }).unwrap();
      // La cookie es accesible desde todos los microfronts (mismo host,
      // distintos puertos) — es solo el contenedor de storage cross-zona del
      // token real, no una cookie de sesión que el navegador adjunte solo
      // (cada request manda el Bearer explícito, ver auth.api.ts).
      setCookieToken(accessToken);
      // Necesario para el refresh automático cuando el access token expira
      // (15 min) — ver authenticated-base-query.ts.
      setRefreshCookieToken(refreshToken.token);
      dispatch(setCredentials({ accessToken }));
      const payload = decodeJwt(accessToken);
      window.location.href = getPostAuthDestination(payload?.roles ?? []);
    } catch {
      setError(true);
    }
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
        disabled={isLoading}
        sx={{
          mt: 1, mb: 2, py: 1.25,
          color: '#fff', fontWeight: 700,
          background: '#E0A800',
          '&:hover': { background: '#D4AC40' },
        }}
      >
        {isLoading ? 'Ingresando…' : 'Ingresar'}
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
