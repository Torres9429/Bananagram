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
import MenuItem from '@mui/material/MenuItem';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { LabeledField, LabeledSelect } from '@repo/ui';
import { PasswordField } from './PasswordField';
import { setCredentials, findUserByEmail, buildTokenFromUser, setCookieToken } from '@repo/ui';
import { MOCK_CATEGORIES, type ProfileType } from '../lib/mock-data';

// Los 5 valores de ProfileType (§A.1 del análisis de dominio) — solo cambia cómo
// se representa el perfil, nunca el flujo ni las capacidades (mismo principio ya
// documentado para BrandType en brands-front/StepBrand.tsx).
const PROFILE_TYPE_OPTIONS: { value: ProfileType; icon: typeof BusinessOutlinedIcon; label: string; example: string }[] = [
  { value: 'brand', icon: BusinessOutlinedIcon, label: 'Marca', example: 'Nike, Zara, Starbucks…' },
  { value: 'company', icon: ApartmentOutlinedIcon, label: 'Empresa', example: 'Consultora, estudio, agencia…' },
  { value: 'organization', icon: GroupsOutlinedIcon, label: 'Organización', example: 'ONG, asociación, colectivo…' },
  { value: 'creator', icon: BrushOutlinedIcon, label: 'Creador', example: '@influencer, artista, creador de contenido…' },
  { value: 'personal', icon: PersonOutlineOutlinedIcon, label: 'Perfil personal', example: 'Dr. Juan Pérez, profesional independiente…' },
];

// Mock: el registro usa la cuenta demo de Cliente.
// Backend: POST /auth/register { name, email, password, type, profileName, category } → JWT real + Perfil creado.
const MOCK_CLIENT_EMAIL = 'cliente@bananagram.mx';
const WEB_SHELL_DASHBOARD_URL = 'http://localhost:3000/dashboard';

export function RegisterForm() {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileType, setProfileType] = useState<ProfileType>('brand');
  const [profileName, setProfileName] = useState('');
  const [category, setCategory] = useState('');
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
    if (profileName.trim() === '' || category === '') {
      setError('Completa el nombre y la categoría de tu perfil');
      return;
    }

    const mockUser = findUserByEmail(MOCK_CLIENT_EMAIL);
    if (!mockUser) return;

    const token = buildTokenFromUser(mockUser);
    setCookieToken(token);
    dispatch(setCredentials({ accessToken: token }));
    setSubmitted(true);

    // El Perfil nace en el mismo instante que el Usuario (§A.2) — no hay un paso
    // posterior de onboarding obligatorio. La persistencia real de profileType/
    // profileName/category queda pendiente de backend (ver nota arriba).
    window.location.href = WEB_SHELL_DASHBOARD_URL;
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
        Registra tu perfil y comienza a gestionar contenido
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {submitted && <Alert severity="success" sx={{ mb: 2 }}>Cuenta creada. Entrando a tu dashboard…</Alert>}

      <LabeledField label="Nombre completo:" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitted} />
      <LabeledField label="Correo electrónico:" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitted} />
      <PasswordField label="Contraseña:" value={password} placeholder="●●●●●●●●●" onChange={(e) => setPassword(e.target.value)} required disabled={submitted} />
      <PasswordField label="Confirmar contraseña:" value={confirmPassword} placeholder="●●●●●●●●●" onChange={(e) => setConfirmPassword(e.target.value)} required disabled={submitted} />

      <Box sx={{ mt: 1, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
          ¿Qué tipo de perfil vas a gestionar?
        </Typography>
        <ToggleButtonGroup
          value={profileType}
          exclusive
          onChange={(_, v) => v && setProfileType(v)}
          sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap' }}
        >
          {PROFILE_TYPE_OPTIONS.map(({ value, icon: Icon, label, example }) => (
            <ToggleButton
              key={value}
              value={value}
              disabled={submitted}
              sx={{
                flex: '1 1 30%',
                minWidth: 140,
                py: 2,
                border: '1px solid #E8E8E8 !important',
                borderRadius: '12px !important',
                flexDirection: 'column',
                gap: 0.75,
                '&.Mui-selected': { bgcolor: '#FFF8E1', borderColor: '#E0A800 !important', color: '#7A5C00' },
              }}
            >
              <Icon />
              <Typography variant="body2" fontWeight={600}>{label}</Typography>
              <Typography variant="caption" color="inherit" sx={{ opacity: 0.7, textTransform: 'none' }}>
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
        required
        disabled={submitted}
      />

      <LabeledSelect
        label="Categoría:"
        value={category}
        onChange={(e) => setCategory(e.target.value as string)}
        displayEmpty
        disabled={submitted}
      >
        <MenuItem value="" disabled><em>Selecciona una categoría</em></MenuItem>
        {MOCK_CATEGORIES.map((c) => (
          <MenuItem key={c} value={c}>{c}</MenuItem>
        ))}
      </LabeledSelect>

      <Button
        type="submit"
        fullWidth
        size="large"
        disabled={submitted}
        sx={{ mt: 1, mb: 2, py: 1.25, color: '#fff', fontWeight: 700, background: '#E0A800', '&:hover': { background: '#D4AC40' } }}
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
