'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LabeledField, ProfileCompletenessBadge, AvailabilityToggle } from '@repo/ui';
import { MOCK_AVAILABLE_CMS, MOCK_AVAILABLE_DESIGNERS, MOCK_CATEGORIES, MOCK_SPECIALTIES } from '../../lib/mock-data';
import { useSelector } from 'react-redux';
import { selectUser } from '@repo/ui';
import type { Availability } from '../../lib/mock-data';

// En mock, el perfil del usuario activo se obtiene buscando en los arrays
// de CMs o Diseñadores disponibles, según su rol.
// En producción: GET /users/me → datos propios del backend.
function findMockProfile(role: string, email: string) {
  if (role === 'community_manager') {
    return MOCK_AVAILABLE_CMS.find((u) => u.id === 'u1') ?? null; // Ana García es la CM demo
  }
  return MOCK_AVAILABLE_DESIGNERS.find((u) => u.id === 'u3') ?? null; // Elías Bailón como Diseñador demo
}

export default function ProfilePage() {
  const user = useSelector(selectUser);
  const mockProfile = user ? findMockProfile(user.role, user.email) : null;

  const [name, setName] = useState(mockProfile?.name ?? user?.email ?? '');
  const [bio, setBio] = useState(mockProfile?.bio ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(mockProfile?.categories ?? []);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(mockProfile?.specialties ?? []);
  const [availability, setAvailability] = useState<Availability>(mockProfile?.availability ?? 'disponible');
  const [saved, setSaved] = useState(false);

  const perfilCompleto = selectedCategories.length > 0 && selectedSpecialties.length > 0;

  function toggleChip<T extends string>(list: T[], item: T, set: (v: T[]) => void) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  function handleSave() {
    // Mock: simula guardado sin llamar al backend.
    // Backend: PATCH /users/me { name, bio, categories, specialties, availability }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Mi perfil</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Mantén tu perfil actualizado para aparecer en las búsquedas del sistema.
      </Typography>

      <ProfileCompletenessBadge isComplete={perfilCompleto} />

      {saved && (
        <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          Perfil actualizado correctamente.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Avatar + disponibilidad */}
        <div className="lg:col-span-4">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
            <Stack alignItems="center" gap={2}>
              <Avatar
                sx={{ width: 80, height: 80, bgcolor: '#FFF8E1', color: '#7A5C00', fontSize: 28, fontWeight: 700 }}
              >
                {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </Avatar>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>{name || 'Tu nombre'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role === 'community_manager' ? 'Community Manager' : 'Diseñador'}
                </Typography>
              </Box>

              <Divider sx={{ width: '100%' }} />

              <AvailabilityToggle value={availability} onChange={setAvailability} />

              {perfilCompleto ? (
                <Chip
                  size="small"
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} />}
                  label="Perfil completo"
                  sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
                />
              ) : (
                <Chip size="small" label="Perfil incompleto" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
              )}
            </Stack>
          </Paper>
        </div>

        {/* Formulario */}
        <div className="lg:col-span-8">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
            <Stack gap={0.5}>
              <LabeledField
                label="Nombre completo:"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
              />
              <LabeledField
                label="Descripción profesional:"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia y especialidad"
                multiline
                rows={3}
              />

              <Divider sx={{ my: 1 }} />

              {/* Categorías */}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, fontSize: 14 }}>
                Categorías en las que trabajas:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                {MOCK_CATEGORIES.map((cat) => {
                  const selected = selectedCategories.includes(cat);
                  return (
                    <Chip
                      key={cat}
                      label={cat}
                      onClick={() => toggleChip(selectedCategories, cat, setSelectedCategories)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selected ? '#FFF8E1' : 'transparent',
                        color: selected ? '#7A5C00' : '#6B6B6B',
                        border: `1px solid ${selected ? '#FDC726' : '#E8E8E8'}`,
                        fontWeight: selected ? 700 : 400,
                        '&:hover': { borderColor: '#FDC726' },
                      }}
                    />
                  );
                })}
              </Box>

              {/* Especialidades */}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500, fontSize: 14 }}>
                Especialidades:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {MOCK_SPECIALTIES.map((sp) => {
                  const selected = selectedSpecialties.includes(sp);
                  return (
                    <Chip
                      key={sp}
                      label={sp}
                      onClick={() => toggleChip(selectedSpecialties, sp, setSelectedSpecialties)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selected ? '#FFF8E1' : 'transparent',
                        color: selected ? '#7A5C00' : '#6B6B6B',
                        border: `1px solid ${selected ? '#FDC726' : '#E8E8E8'}`,
                        fontWeight: selected ? 700 : 400,
                        '&:hover': { borderColor: '#FDC726' },
                      }}
                    />
                  );
                })}
              </Box>

              <Button
                variant="contained"
                onClick={handleSave}
                sx={{ alignSelf: 'flex-end', bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
              >
                Guardar cambios
              </Button>
            </Stack>
          </Paper>
        </div>
      </div>
    </Box>
  );
}
