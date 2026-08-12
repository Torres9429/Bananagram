'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { FormDialog, LabeledField, useToast } from '@repo/ui/ui';
import { useListCategoriesQuery } from '@repo/ui/state';
import { useListEligibleCMsQuery, useCreateCampaignMutation } from '../store/api/campaigns.api';
import { CmPicker } from './CmPicker';

interface CreateCampaignDialogProps {
  open: boolean;
  brandId: string;
  // Respaldo para las recomendaciones de CM cuando el Cliente todavía no
  // eligió categorías de campaña (ver Contexto de la Fase J en el plan).
  brandCategoryId?: string | null;
  onClose: () => void;
  // RTK Query ya invalida el cache de listCampaigns al crear — el padre solo
  // necesita saber que terminó (para, por ejemplo, cerrar su propio estado).
  onCreated?: () => void;
}

// Fase J: el CM ahora debe ACEPTAR la campaña antes de que nada más pase —
// ya no se le asignan Diseñadores aquí (ese paso era en realidad un bug:
// CampaignsService.assignDesigner exige ser el CM asignado, el Cliente no
// lo es, así que esa llamada nunca funcionó de verdad). El CM arma su
// equipo después de aceptar, desde su equipo general.
export function CreateCampaignDialog({ open, brandId, brandCategoryId, onClose, onCreated }: CreateCampaignDialogProps) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [cmId, setCmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useListCategoriesQuery();
  // Sin categorías elegidas todavía, se usa la de la marca como respaldo
  // para no dejar las recomendaciones vacías desde el primer render.
  const effectiveCategoryIds = categoryIds.length ? categoryIds : brandCategoryId ? [brandCategoryId] : [];
  // Misma query que usa <CmPicker /> internamente (RTK Query la comparte,
  // no hay doble fetch) — se necesita aquí también para resolver el nombre
  // del CM elegido al armar el mensaje de éxito.
  const { data: eligibleCMs = [] } = useListEligibleCMsQuery(effectiveCategoryIds, { skip: !open });
  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation();
  const { showSuccess, showError } = useToast();

  const selectedCm = eligibleCMs.find((cm) => cm.userId === cmId) ?? null;

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function reset() {
    setName('');
    setObjective('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setCategoryIds([]);
    setCmId(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (!name.trim() || !selectedCm) return;
    setError(null);
    try {
      await createCampaign({
        brandId,
        name: name.trim(),
        objective: objective.trim() || undefined,
        description: description.trim() || undefined,
        cmId: selectedCm.userId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        categoryIds: categoryIds.length ? categoryIds : undefined,
      }).unwrap();

      reset();
      onCreated?.();
      onClose();
      showSuccess(`Campaña creada — se notificó a ${selectedCm.name} para que la confirme.`);
    } catch {
      setError('No se pudo crear la campaña. Verifica los datos e intenta de nuevo.');
      showError('No se pudo crear la campaña.');
    }
  }

  return (
    <FormDialog
      open={open}
      title="Nueva campaña"
      maxWidth="sm"
      confirmLabel={isCreating ? 'Creando…' : 'Crear'}
      confirmDisabled={!name.trim() || !selectedCm || isCreating}
      onClose={handleClose}
      onConfirm={handleCreate}
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <LabeledField label="Nombre" placeholder="Ej. Campaña Verano 2026" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      <LabeledField label="Objetivo (opcional)" placeholder="Ej. Aumentar el alcance de la colección" value={objective} onChange={(e) => setObjective(e.target.value)} />
      <LabeledField label="Descripción (opcional)" placeholder="Ej. Contenido semanal en Instagram y TikTok" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} />
      <Stack direction="row" gap={2}>
        <Box sx={{ flex: 1 }}>
          <LabeledField label="Inicio" type="date" placeholder="dd/mm/aaaa" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <LabeledField label="Fin" type="date" placeholder="dd/mm/aaaa" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Box>
      </Stack>

      {categories.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Categorías de la campaña (opcional)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Ayudan a recomendarte un Community Manager afín al tipo de campaña.
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                onClick={() => toggleCategory(cat.id)}
                color={categoryIds.includes(cat.id) ? 'primary' : 'default'}
                variant={categoryIds.includes(cat.id) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Divider sx={{ mb: 2.5 }} />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Elige un Community Manager</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Solo puedes seleccionar uno por campaña — se le notificará para que confirme antes de que
          empiece a trabajar en ella. Cuando confirme, armará su propio equipo de Diseñadores.
        </Typography>
        <CmPicker categoryIds={effectiveCategoryIds} value={cmId} onChange={setCmId} skip={!open} />
      </Box>
    </FormDialog>
  );
}
