'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { PasswordField } from './PasswordField';
import { setCredentials, setCookieToken } from '@repo/ui/state';
import { findUserByEmail, buildTokenFromUser } from '@repo/ui';

// useSearchParams se usa SOLO para leer el email del enlace de activación
// (no para sesión). La sesión se establece mediante la cookie.
// En producción, este parámetro será un JWT firmado de un solo uso.

const WEB_SHELL_DASHBOARD_URL = 'http://localhost:3000/dashboard';

const ROLE_LABEL: Record<string, string> = {
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
};

export function ActivateForm() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const user = findUserByEmail(emailParam);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!emailParam || !user) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="error" mb={1}>Enlace inválido</Typography>
        <Typography variant="body2" color="text.secondary">
          Este enlace de activación no es válido o ya fue utilizado. Solicita al Administrador que te envíe uno nuevo.
        </Typography>
      </Box>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    const token = buildTokenFromUser(user!);
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    setDone(true);
    setTimeout(() => { window.location.href = WEB_SHELL_DASHBOARD_URL; }, 1400);
  }

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {done ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#2E7D32', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>¡Cuenta activada!</Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, {user.name}. Redirigiendo al sistema…
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', width: 40, height: 40 }}>
              <KeyOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.secondary">Activa tu cuenta</Typography>
              <Chip label={roleLabel} size="small" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
            </Box>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Hola, <strong>{user.name}</strong>. Establece una contraseña para comenzar.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>Cuenta: {user.email}</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <PasswordField label="Nueva contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required />
          <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} required />

          <Button type="submit" fullWidth size="large"
            sx={{ mt: 1, mb: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}>
            Activar cuenta y acceder
          </Button>
        </>
      )}
    </Box>
  );
}
