'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LabeledField, ProfileCompletenessBadge, AvailabilityToggle, PrimaryButton } from '@repo/ui/ui';
import { MOCK_CATEGORIES, MOCK_SPECIALTIES } from '../../lib/mock-data';
import type { Availability, MockAvailableCM, MockAvailableDesigner } from '../../lib/mock-data';

interface StaffProfileSectionProps {
  mockProfile: MockAvailableCM | MockAvailableDesigner | null;
  name: string;
  onNameChange: (name: string) => void;
}

// Contenido de CM/Diseñador en ProfilePage (§4 del rediseño de dominio) — misma
// lógica y campos que la pantalla tenía antes de separar el Header común; solo
// se relocalizó para convivir con ClientSection, sin cambiar comportamiento.
// CM y Diseñador comparten esta única sección porque hoy tienen exactamente
// los mismos campos (categorías, especialidades, disponibilidad, bio) — el
// switch de ProfilePage los agrupa en la misma rama en vez de duplicar el
// componente con lógica idéntica.
export function StaffProfileSection({ mockProfile, name, onNameChange }: StaffProfileSectionProps) {
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
    <>
      <ProfileCompletenessBadge isComplete={perfilCompleto} />

      {saved && (
        <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3, mt: 2, borderRadius: 2 }}>
          Perfil actualizado correctamente.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Disponibilidad + estado de completitud */}
        <div className="lg:col-span-4">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Stack alignItems="center" gap={2}>
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
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Stack gap={0.5}>
              <LabeledField
                label="Nombre completo:"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
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
                        bgcolor: selected ? 'primary.light' : 'transparent',
                        color: selected ? '#7A5C00' : '#6B6B6B',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: selected ? 'primary.main' : 'divider',
                        fontWeight: selected ? 700 : 400,
                        '&:hover': { borderColor: 'primary.main' },
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
                        bgcolor: selected ? 'primary.light' : 'transparent',
                        color: selected ? '#7A5C00' : '#6B6B6B',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: selected ? 'primary.main' : 'divider',
                        fontWeight: selected ? 700 : 400,
                        '&:hover': { borderColor: 'primary.main' },
                      }}
                    />
                  );
                })}
              </Box>

              <PrimaryButton onClick={handleSave} sx={{ alignSelf: 'flex-end' }}>
                Guardar cambios
              </PrimaryButton>
            </Stack>
          </Paper>
        </div>
      </div>
    </>
  );
}
