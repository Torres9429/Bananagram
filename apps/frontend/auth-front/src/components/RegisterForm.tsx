'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import MenuItem from '@mui/material/MenuItem';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { LabeledField, LabeledSelect } from '@repo/ui/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, setCookieToken } from '@repo/ui/state';
import { getPostAuthDestination } from '@repo/ui/utils';
import { findUserByEmail, buildTokenFromUser } from '@repo/ui';
import { AppRole } from '@repo/ui/types';
import {
  MOCK_CATEGORIES,
  MOCK_SPECIALTIES,
  MOCK_CLIENT_EMAIL,
  MOCK_CM_EMAIL,
  MOCK_DESIGNER_EMAIL,
  ROLE_LABEL,
} from '../lib/mock-data';
import type { ProfileType } from '@repo/ui/types';

// Los 5 valores de ProfileType (§A.1 del análisis de dominio) — solo cambia cómo
// se representa el perfil, nunca el flujo ni las capacidades.
const PROFILE_TYPE_OPTIONS: { value: ProfileType; icon: typeof BusinessOutlinedIcon; label: string; example: string }[] = [
  { value: 'brand', icon: BusinessOutlinedIcon, label: 'Marca', example: 'Nike, Zara, Starbucks…' },
  { value: 'company', icon: ApartmentOutlinedIcon, label: 'Empresa', example: 'Consultora, estudio, agencia…' },
  { value: 'organization', icon: GroupsOutlinedIcon, label: 'Organización', example: 'ONG, asociación, colectivo…' },
  { value: 'creator', icon: BrushOutlinedIcon, label: 'Creador', example: '@influencer, artista, creador de contenido…' },
  { value: 'personal', icon: PersonOutlineOutlinedIcon, label: 'Perfil personal', example: 'Dr. Juan Pérez, profesional independiente…' },
];

// Rol elegido en el paso 1 — determina qué pide el paso 2 (perfil de marca
// para Cliente, o categorías/especialidades para CM/Diseñador, mismo
// criterio que RegisterDto/CompleteProfileDto en el backend real).
const ROLE_OPTIONS: { value: AppRole; icon: typeof BusinessOutlinedIcon; label: string }[] = [
  { value: AppRole.CLIENTE, icon: PersonOutlineOutlinedIcon, label: 'Cliente' },
  { value: AppRole.COMMUNITY_MANAGER, icon: GroupsOutlinedIcon, label: 'Community Manager' },
  { value: AppRole.DISENADOR, icon: BrushOutlinedIcon, label: 'Diseñador' },
];

const STEPS = ['Tu cuenta', 'Tu perfil'];

export function RegisterForm() {
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<AppRole>(AppRole.CLIENTE);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('brand');
  const [profileName, setProfileName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isClient = role === AppRole.CLIENTE;

  // Paso 1 → 2: valida los datos de cuenta y avanza sin crear nada todavía.
  function goToProfileStep() {
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError('Completa tu nombre y correo electrónico');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setStep(1);
  }

  function handleBack() {
    setError(null);
    setStep(0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === 0) {
      goToProfileStep();
      return;
    }

    setError(null);
    if (isClient) {
      if (profileName.trim() === '' || categoryId === '') {
        setError('Completa el nombre y la categoría de tu perfil');
        return;
      }
    } else {
      // Mismo criterio que UserProfilesController.upsert (core-service):
      // categoryIds/specialtyIds son obligatorios para community_manager/disenador.
      if (categoryIds.length === 0 || specialtyIds.length === 0) {
        setError('Selecciona al menos una categoría y una especialidad');
        return;
      }
    }

    const mockEmail =
      role === AppRole.CLIENTE ? MOCK_CLIENT_EMAIL : role === AppRole.COMMUNITY_MANAGER ? MOCK_CM_EMAIL : MOCK_DESIGNER_EMAIL;
    const mockUser = findUserByEmail(mockEmail);
    if (!mockUser) return;

    const token = buildTokenFromUser(mockUser);
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    setSubmitted(true);

    // El Perfil nace en el mismo instante que el Usuario (§A.2) — no hay un paso
    // posterior de onboarding obligatorio. La persistencia real de profileType/
    // profileName/category (o categoryIds/specialtyIds para CM/Diseñador) queda
    // pendiente de backend (ver nota arriba).
    window.location.href = getPostAuthDestination(mockUser.role);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Crea tu cuenta
        </Typography>
        <Chip label={ROLE_LABEL[role]} size="small" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Registra tu perfil y comienza a generar contenido
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Paso {step + 1} de {STEPS.length} · {STEPS[step]}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {submitted && <Alert severity="success" sx={{ mb: 2 }}>Cuenta creada. Entrando a tu dashboard…</Alert>}

      {/*
        Los dos pasos se renderizan siempre, superpuestos en la misma celda de
        grid (gridArea '1 / 1'). Así el contenedor toma automáticamente la
        altura del paso más alto y el tamaño nunca cambia al navegar entre
        pasos — el inactivo solo se oculta con visibility, sin salir del flujo.
      */}
      <Box sx={{ display: 'grid' }}>
        <Box
          sx={{
            gridArea: '1 / 1',
            visibility: step === 0 ? 'visible' : 'hidden',
          }}
          aria-hidden={step !== 0}
        >
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
                  tabIndex={step === 0 ? 0 : -1}
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

          <LabeledField label="Nombre completo:" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} tabIndex={step === 0 ? 0 : -1} />
          <LabeledField label="Correo electrónico:" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} tabIndex={step === 0 ? 0 : -1} />
          <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} />
          <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} />

          <Button
            type="submit"
            fullWidth
            size="large"
            tabIndex={step === 0 ? 0 : -1}
            sx={{ mt: 0.5, mb: 1.5, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}
          >
            Siguiente
          </Button>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            ¿Ya tienes una cuenta?{' '}
            <Box component={Link} href="/login" sx={{ color: '#E6A817', fontWeight: 600, textDecoration: 'none' }} tabIndex={step === 0 ? 0 : -1}>
              Inicia sesión
            </Box>
          </Typography>
        </Box>

        <Box
          sx={{
            gridArea: '1 / 1',
            visibility: step === 1 ? 'visible' : 'hidden',
          }}
          aria-hidden={step !== 1}
        >
          {isClient ? (
            <>
              <Box sx={{ mt: 1, mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  ¿Qué tipo de perfil quieres crear?
                </Typography>
                <ToggleButtonGroup
                  value={profileType}
                  exclusive
                  onChange={(_, v) => v && setProfileType(v)}
                  disabled={submitted}
                  sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}
                >
                  {PROFILE_TYPE_OPTIONS.map(({ value, icon: Icon, label, example }) => (
                    <ToggleButton
                      key={value}
                      value={value}
                      tabIndex={step === 1 ? 0 : -1}
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
                      <Typography variant="caption" color="inherit" sx={{ opacity: 0.7, textTransform: 'none', fontSize: 10, lineHeight: 1.2 }}>
                        {example}
                      </Typography>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <LabeledField
                label={profileType === 'brand' ? 'Nombre de la marca:' : 'Nombre del perfil:'}
                placeholder={profileType === 'brand' ? 'Ej. Nike México' : 'Ej. Dra. María López'}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={submitted}
                tabIndex={step === 1 ? 0 : -1}
              />

              <LabeledSelect
                label="Categoría:"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value as string)}
                displayEmpty
                disabled={submitted}
              >
                <MenuItem value="" disabled><em>Selecciona una categoría</em></MenuItem>
                {MOCK_CATEGORIES.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </LabeledSelect>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cuéntanos en qué trabajas para que las marcas y campañas correctas te encuentren.
              </Typography>

              <LabeledSelect
                label="Categorías en las que trabajas:"
                multiple
                value={categoryIds}
                onChange={(e) => setCategoryIds(e.target.value as string[])}
                disabled={submitted}
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
                disabled={submitted}
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
            </>
          )}

          <Stack direction="row" gap={1.5} sx={{ mt: 0.5, mb: 0.5 }}>
            <Button
              type="button"
              variant="outlined"
              size="large"
              onClick={handleBack}
              disabled={submitted}
              tabIndex={step === 1 ? 0 : -1}
              sx={{ flex: 1, py: 1.25, borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}
            >
              Atrás
            </Button>
            <Button
              type="submit"
              size="large"
              disabled={submitted}
              tabIndex={step === 1 ? 0 : -1}
              sx={{ flex: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}
            >
              Crear cuenta
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
