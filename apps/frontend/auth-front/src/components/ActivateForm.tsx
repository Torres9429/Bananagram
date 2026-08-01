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
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { PasswordField } from './PasswordField';
import { LabeledSelect } from '@repo/ui/ui';
import { setCredentials, setCookieToken } from '@repo/ui/state';
import { getPostAuthDestination } from '@repo/ui/utils';
import { findUserByEmail, buildTokenFromUser } from '@repo/ui';
import { AppRole } from '@repo/ui/types';
import { ROLE_LABEL, MOCK_CATEGORIES, MOCK_SPECIALTIES } from '../lib/mock-data';

// useSearchParams se usa SOLO para leer el email del enlace de activación
// (no para sesión). La sesión se establece mediante la cookie.
// En producción, este parámetro será un JWT firmado de un solo uso.

export function ActivateForm() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const user = findUserByEmail(emailParam);

  // Un CM/Diseñador dado de alta por el Admin (solo email+password+rol, sin
  // categorías/especialidades — ver CreateUserDto en el backend real) queda
  // con el perfil incompleto hasta este paso, mismo criterio que
  // PATCH /me/profile: obligatorio para community_manager/disenador, no
  // aplica a Cliente.
  const needsProfileCompletion =
    !!user &&
    (user.role === AppRole.COMMUNITY_MANAGER || user.role === AppRole.DISENADOR) &&
    (!user.categoryIds?.length || !user.specialtyIds?.length);

  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>(user?.categoryIds ?? []);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>(user?.specialtyIds ?? []);
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

  function finishActivation() {
    const token = buildTokenFromUser(user!);
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    setDone(true);
    setTimeout(() => { window.location.href = getPostAuthDestination(user!.role); }, 1400);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }

    if (needsProfileCompletion) {
      setPasswordConfirmed(true);
      return;
    }
    finishActivation();
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (categoryIds.length === 0 || specialtyIds.length === 0) {
      setError('Selecciona al menos una categoría y una especialidad');
      return;
    }
    finishActivation();
  }

  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const showProfileStep = passwordConfirmed && needsProfileCompletion;

  return (
    <Box component="form" onSubmit={showProfileStep ? handleProfileSubmit : handlePasswordSubmit}>
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
              <Typography variant="h5" fontWeight={700} color="text.secondary">
                {showProfileStep ? 'Completa tu perfil' : 'Activa tu cuenta'}
              </Typography>
              <Chip label={roleLabel} size="small" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {showProfileStep ? (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Ya casi, <strong>{user.name}</strong>. Cuéntanos en qué trabajas para terminar de activar tu cuenta.
              </Typography>

              <LabeledSelect
                label="Categorías en las que trabajas:"
                multiple
                value={categoryIds}
                onChange={(e) => setCategoryIds(e.target.value as string[])}
                displayEmpty
                renderValue={(selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return <em>Selecciona una o más categorías</em>;
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {ids.map((id) => (
                        <Chip key={id} label={MOCK_CATEGORIES.find((c) => c.id === id)?.name ?? id} size="small" />
                      ))}
                    </Box>
                  );
                }}
              >
                {MOCK_CATEGORIES.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Checkbox checked={categoryIds.includes(c.id)} size="small" />
                    <ListItemText primary={c.name} />
                  </MenuItem>
                ))}
              </LabeledSelect>

              <LabeledSelect
                label="Tus especialidades:"
                multiple
                value={specialtyIds}
                onChange={(e) => setSpecialtyIds(e.target.value as string[])}
                displayEmpty
                renderValue={(selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return <em>Selecciona una o más especialidades</em>;
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {ids.map((id) => (
                        <Chip key={id} label={MOCK_SPECIALTIES.find((s) => s.id === id)?.name ?? id} size="small" />
                      ))}
                    </Box>
                  );
                }}
              >
                {MOCK_SPECIALTIES.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Checkbox checked={specialtyIds.includes(s.id)} size="small" />
                    <ListItemText primary={s.name} />
                  </MenuItem>
                ))}
              </LabeledSelect>

              <Button type="submit" fullWidth size="large"
                sx={{ mt: 1, mb: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}>
                Completar perfil y acceder
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Hola, <strong>{user.name}</strong>. Establece una contraseña para comenzar.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>Cuenta: {user.email}</Typography>

              <PasswordField label="Nueva contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required />
              <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} required />

              <Button type="submit" fullWidth size="large"
                sx={{ mt: 1, mb: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}>
                {needsProfileCompletion ? 'Continuar' : 'Activar cuenta y acceder'}
              </Button>
            </>
          )}
        </>
      )}
    </Box>
  );
}
