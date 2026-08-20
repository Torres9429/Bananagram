'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { LabeledField } from '@repo/ui/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, setCookieToken, setRefreshCookieToken, useRegisterMutation, decodeJwt } from '@repo/ui/state';
import { getPostAuthDestination } from '@repo/ui/utils';
import { AppRole } from '@repo/ui/types';

// Rol elegido — determina roleName (RegisterDto real: 'cliente'|'cm'|
// 'disenador', nombres cortos). Categorías/especialidades de CM/Diseñador
// y perfil de marca de Cliente ya NO se piden aquí (se pedían antes, pero
// nunca se persistían — el registro anónimo no tiene acceso al catálogo
// real, que exige estar autenticado; catalogos:ver). Se completan después,
// desde el perfil ya logueado.
const ROLE_OPTIONS: { value: AppRole; icon: typeof PersonOutlineOutlinedIcon; label: string; roleName: 'cliente' | 'cm' | 'disenador' }[] = [
  { value: AppRole.CLIENTE, icon: PersonOutlineOutlinedIcon, label: 'Cliente', roleName: 'cliente' },
  { value: AppRole.COMMUNITY_MANAGER, icon: GroupsOutlinedIcon, label: 'Community Manager', roleName: 'cm' },
  { value: AppRole.DISENADOR, icon: BrushOutlinedIcon, label: 'Diseñador', roleName: 'disenador' },
];

const ROLE_LABEL: Record<AppRole, string> = {
  [AppRole.CLIENTE]: 'Cliente',
  [AppRole.COMMUNITY_MANAGER]: 'Community Manager',
  [AppRole.DISENADOR]: 'Diseñador',
  [AppRole.ADMINISTRADOR]: 'Administrador',
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  }
  return 'No se pudo crear la cuenta. Intenta de nuevo.';
}

export function RegisterForm() {
  const dispatch = useDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [role, setRole] = useState<AppRole>(AppRole.CLIENTE);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Completa tu nombre y correo electrónico');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const roleName = ROLE_OPTIONS.find((r) => r.value === role)!.roleName;

    try {
      const { accessToken, refreshToken } = await register({ name: name.trim(), email: email.trim(), password, roleName }).unwrap();
      setCookieToken(accessToken);
      setRefreshCookieToken(refreshToken.token);
      dispatch(setCredentials({ accessToken }));
      const payload = decodeJwt(accessToken);
      window.location.href = getPostAuthDestination(payload?.roles ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Crea tu cuenta
        </Typography>
        <Chip label={ROLE_LABEL[role]} size="small" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Registra tu cuenta y comienza a generar contenido
        {role === AppRole.CLIENTE && ' — podrás crear tu marca desde tu perfil en cuanto entres'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          ¿Qué tipo de usuario eres?
        </Typography>
        <ToggleButtonGroup
          value={role}
          exclusive
          onChange={(_, v) => v && setRole(v)}
          sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}
        >
          {ROLE_OPTIONS.map(({ value, icon: Icon, label }) => (
            <ToggleButton
              key={value}
              value={value}
              sx={{
                flex: '1 1 30%',
                minWidth: 108,
                py: 1,
                px: 1,
                border: '1px solid #E8E8E8 !important',
                borderRadius: '10px !important',
                flexDirection: 'column',
                gap: 0.25,
                '&.Mui-selected': { bgcolor: '#FFF8E1', borderColor: '#E0A800 !important', color: 'primary.contrastTextMuted' },
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: 12, lineHeight: 1.2 }}>{label}</Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <LabeledField label="Nombre completo:" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <LabeledField label="Correo electrónico:" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} />
      <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} />

      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={isLoading}
        sx={{ mt: 0.5, mb: 1.5, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}
      >
        {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
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
