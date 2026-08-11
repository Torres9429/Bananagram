'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { FormDialog, LabeledField } from '@repo/ui/ui';
import { getInitials } from '@repo/ui/utils';
import {
  useListEligibleCMsQuery,
  useListEligibleDesignersQuery,
  useCreateCampaignMutation,
  useAssignDesignerMutation,
} from '../store/api/campaigns.api';

interface CreateCampaignDialogProps {
  open: boolean;
  brandId: string;
  onClose: () => void;
  // RTK Query ya invalida el cache de listCampaigns al crear — el padre solo
  // necesita saber que terminó (para, por ejemplo, cerrar su propio estado).
  onCreated?: () => void;
}

// Reescrito para consumir /campaigns real (ver plan de integración):
// - "status" al crear ya no es elegible en UI: CreateCampaignDto no lo acepta,
//   toda campaña nace 'active' en el backend — cambiar el estado es un PATCH
//   posterior (edición), fuera de alcance de este diálogo de creación.
// - El picker de "cuentas sociales de la campaña" del mock se quita: el
//   modelo real no vincula Campaign↔SocialAccount directamente (el fan-out
//   multi-red vive en PostSocialAccount, a nivel de Post, no de Campaign).
// - "Coincide con tu categoría" también se quita: GET /campaigns/eligible-*
//   devuelve solo {userId, name, avatarUrl}, sin categorías por CM.
export function CreateCampaignDialog({ open, brandId, onClose, onCreated }: CreateCampaignDialogProps) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cmId, setCmId] = useState<string | null>(null);
  const [designerIds, setDesignerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: eligibleCMs = [] } = useListEligibleCMsQuery(undefined, { skip: !open });
  const { data: eligibleDesigners = [] } = useListEligibleDesignersQuery(undefined, { skip: !open });
  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation();
  const [assignDesigner] = useAssignDesignerMutation();

  const selectedCm = eligibleCMs.find((cm) => cm.userId === cmId) ?? null;

  function toggleDesigner(id: string) {
    setDesignerIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!name.trim() || !selectedCm) return;
    setError(null);
    try {
      const campaign = await createCampaign({
        brandId,
        name: name.trim(),
        objective: objective.trim() || undefined,
        description: description.trim() || undefined,
        cmId: selectedCm.userId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }).unwrap();

      await Promise.all(designerIds.map((userId) => assignDesigner({ campaignId: campaign.id, userId }).unwrap()));

      setName('');
      setObjective('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setCmId(null);
      setDesignerIds([]);
      onCreated?.();
      onClose();
    } catch {
      setError('No se pudo crear la campaña. Verifica los datos e intenta de nuevo.');
    }
  }

  return (
    <FormDialog
      open={open}
      title="Nueva campaña"
      maxWidth="sm"
      confirmLabel={isCreating ? 'Creando…' : 'Crear'}
      confirmDisabled={!name.trim() || !selectedCm || isCreating}
      onClose={onClose}
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

      <Divider sx={{ mb: 2.5 }} />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Elige un Community Manager</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Solo puedes seleccionar un CM por campaña — no se puede cambiar después de creada.
        </Typography>
        {eligibleCMs.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>No hay Community Managers disponibles.</Alert>
        ) : (
          <Stack gap={1}>
            {eligibleCMs.map((cm) => {
              const active = cmId === cm.userId;
              return (
                <Stack
                  key={cm.userId}
                  direction="row"
                  gap={1.5}
                  alignItems="center"
                  onClick={() => setCmId(cm.userId)}
                  sx={{
                    p: 1.5,
                    border: active ? '1.5px solid #E0A800' : '1px solid #E8E8E8',
                    bgcolor: active ? '#FFFDE7' : '#fff',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#E0A800' },
                  }}
                >
                  <Avatar src={cm.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 600 }}>
                    {getInitials(cm.name)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{cm.name}</Typography>
                  {active && <Chip size="small" label="Seleccionado" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600, fontSize: 11 }} />}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>

      {selectedCm && (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Diseñadores (opcional)</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Puedes asignar diseñadores ahora o después desde el detalle de la campaña.
          </Typography>
          {eligibleDesigners.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>No hay Diseñadores disponibles.</Alert>
          ) : (
            <Stack gap={0.5}>
              {eligibleDesigners.map((d) => (
                <Stack
                  key={d.userId}
                  direction="row"
                  gap={1}
                  alignItems="center"
                  onClick={() => toggleDesigner(d.userId)}
                  sx={{ p: 1, border: '1px solid #E8E8E8', borderRadius: 2, cursor: 'pointer' }}
                >
                  <Checkbox size="small" checked={designerIds.includes(d.userId)} sx={{ p: 0.5 }} />
                  <Avatar src={d.avatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 600 }}>
                    {getInitials(d.name)}
                  </Avatar>
                  <Typography variant="body2">{d.name}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </FormDialog>
  );
}
