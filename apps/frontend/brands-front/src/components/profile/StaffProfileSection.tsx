'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { LabeledField, ProfileCompletenessBadge, PrimaryButton, useToast } from '@repo/ui/ui';
import { useListCategoriesQuery, useListSpecialtiesQuery, useCompleteProfileMutation, useUploadAvatarMutation } from '@repo/ui/state';
import { getInitials } from '@repo/ui/utils';
import type { StaffProfileSectionProps } from '../../interfaces/interface';

// El backend rechaza el guardado si categorías/especialidades quedan en
// blanco ("Las categorías son obligatorias para community manager y
// diseñador") — mostrar ese mensaje real en vez de uno genérico, mismo
// patrón ya usado en RegisterForm/GenerateIdeasSection/los paneles de IA.
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  }
  return 'No se pudo actualizar el perfil. Intenta de nuevo.';
}

// Contenido de CM/Diseñador en ProfilePage (§4 del rediseño de dominio) —
// antes 100% mock (handleSave nunca llamaba al backend, categorías/
// especialidades venían de MOCK_CATEGORIES/MOCK_SPECIALTIES locales) — un
// hallazgo real: un usuario dado de alta desde /admin-front/users nunca
// aparecía en "asignar diseñador a campaña" porque su UserProfile jamás se
// creaba, y este era el único formulario pensado para completarlo (ver
// profile.service.ts.completeProfile). Ahora usa el catálogo real y PATCH
// me/profile real.
//
// Rediseño (columna izquierda antes casi vacía tras quitar bio/
// disponibilidad — no existen como campo en UserProfile): ahora es la
// tarjeta de identidad completa (foto + nombre + estado), que reemplaza al
// <ProfileHeader> genérico que vivía aparte en ProfilePage (borrado, quedaba
// redundante con esto — ProfileHeader era exclusivo de esta rama, nunca lo
// usaba ClientSection). La columna derecha queda solo para
// categorías/especialidades, con contador de selección y skeleton mientras
// carga el catálogo.
export function StaffProfileSection({ profile, name, onNameChange }: StaffProfileSectionProps) {
  const { data: categories = [], isLoading: loadingCategories } = useListCategoriesQuery();
  const { data: specialties = [], isLoading: loadingSpecialties } = useListSpecialtiesQuery();
  const [completeProfile, { isLoading: isSaving }] = useCompleteProfileMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.categories.map((c) => c.categoryId) ?? [],
  );
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    profile?.specialties.map((s) => s.specialtyId) ?? [],
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);

  // `profile` llega de una query asíncrona — si el primer render ocurre
  // antes de que resuelva (o resuelve null porque el perfil no existe
  // todavía), hay que sincronizar la selección una vez que sí llegue.
  useEffect(() => {
    if (profile) {
      setSelectedCategories(profile.categories.map((c) => c.categoryId));
      setSelectedSpecialties(profile.specialties.map((s) => s.specialtyId));
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  const perfilCompleto = selectedCategories.length > 0 && selectedSpecialties.length > 0;

  function toggleChip(list: string[], item: string, set: (v: string[]) => void) {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  // Sube la foto de inmediato (mejor feedback que esperar a "Guardar
  // cambios" para saber si la imagen sirvió), pero NO la persiste en
  // UserProfile todavía — eso pasa junto con el resto del formulario en
  // handleSave, una sola fuente de verdad de "guardar".
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { avatarUrl: uploadedUrl } = await uploadAvatar(file).unwrap();
      setAvatarUrl(uploadedUrl);
      showSuccess('Foto lista — dale "Guardar cambios" para conservarla.');
    } catch (err) {
      showError(getErrorMessage(err));
    }
  }

  async function handleSave() {
    try {
      await completeProfile({
        name,
        avatarUrl: avatarUrl ?? undefined,
        categoryIds: selectedCategories,
        specialtyIds: selectedSpecialties,
      }).unwrap();
      showSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      showError(getErrorMessage(err));
    }
  }

  return (
    <>
      <ProfileCompletenessBadge isComplete={perfilCompleto} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Identidad: foto + nombre + estado de completitud */}
        <div className="lg:col-span-4">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
            <Stack alignItems="center" gap={2}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={avatarUrl ?? undefined}
                  sx={{ width: 88, height: 88, bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontSize: 28, fontWeight: 700 }}
                >
                  {!avatarUrl && (getInitials(name).toUpperCase() || '—')}
                </Avatar>
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Cambiar foto de perfil"
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'primary.light' },
                  }}
                >
                  {isUploadingAvatar ? <CircularProgress size={16} /> : <PhotoCameraOutlinedIcon fontSize="small" />}
                </IconButton>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </Box>

              <Box sx={{ width: '100%' }}>
                <LabeledField
                  label="Nombre completo:"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Tu nombre completo"
                  sx={{ mb: 1.5 }}
                />
              </Box>

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

        {/* Categorías y especialidades */}
        <div className="lg:col-span-8">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Stack gap={2.5}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: 14 }}>
                    Categorías en las que trabajas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{selectedCategories.length} seleccionadas</Typography>
                </Stack>
                {loadingCategories ? (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rounded" width={96} height={32} sx={{ borderRadius: 4 }} />
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {categories.map((cat) => {
                      const selected = selectedCategories.includes(cat.id);
                      return (
                        <Chip
                          key={cat.id}
                          label={cat.name}
                          onClick={() => toggleChip(selectedCategories, cat.id, setSelectedCategories)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: selected ? 'primary.light' : 'transparent',
                            color: selected ? 'primary.contrastTextMuted' : '#6B6B6B',
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
                )}
              </Box>

              <Divider />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: 14 }}>
                    Especialidades
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{selectedSpecialties.length} seleccionadas</Typography>
                </Stack>
                {loadingSpecialties ? (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} variant="rounded" width={110} height={32} sx={{ borderRadius: 4 }} />
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {specialties.map((sp) => {
                      const selected = selectedSpecialties.includes(sp.id);
                      return (
                        <Chip
                          key={sp.id}
                          label={sp.name}
                          onClick={() => toggleChip(selectedSpecialties, sp.id, setSelectedSpecialties)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: selected ? 'primary.light' : 'transparent',
                            color: selected ? 'primary.contrastTextMuted' : '#6B6B6B',
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
                )}
              </Box>

              <Stack direction="row" justifyContent="flex-end">
                <PrimaryButton onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Guardando…' : 'Guardar cambios'}
                </PrimaryButton>
              </Stack>
            </Stack>
          </Paper>
        </div>
      </div>
    </>
  );
}
