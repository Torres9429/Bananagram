'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { FormDialog, LabeledField, LabeledSelect } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { getInitials } from '@repo/ui/utils';
import type { MockCampaign, CampaignStatus, MockTeamMember, CreateCampaignDialogProps } from '../interfaces/interface';
import { getAvailableCMsForCategory, getSocialAccountsByProfile, getSocialNetwork } from '../lib/mock-data';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'Activa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'finished', label: 'Finalizada' },
];

export function CreateCampaignDialog({ open, brandId, brandCategory, onClose, onCreate }: CreateCampaignDialogProps) {
  const user = useSelector(selectUser);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('active');
  const [cmId, setCmId] = useState<string | null>(null);
  const [designerIds, setDesignerIds] = useState<string[]>([]);
  const [socialAccountIds, setSocialAccountIds] = useState<string[]>([]);

  const availableCMs = getAvailableCMsForCategory(brandCategory);
  const selectedCm = availableCMs.find((cm) => cm.id === cmId) ?? null;
  const availableSocialAccounts = getSocialAccountsByProfile(brandId);

  function toggleSocialAccount(id: string) {
    setSocialAccountIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  useEffect(() => {
    // Al elegir un CM, el sistema sugiere por defecto a los diseñadores que
    // ya trabajan con él (simulación del paso 9 del onboarding).
    setDesignerIds(selectedCm ? selectedCm.designers.map((d) => d.id) : []);
  }, [cmId]);

  function toggleDesigner(id: string) {
    setDesignerIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function handleCreate() {
    if (!name.trim() || !selectedCm || socialAccountIds.length === 0) return;

    // El CM ya no viaja como "team member" — se setea directo en
    // MockCampaign.cmId (FK única). Solo los Diseñadores elegidos se
    // reportan como team (CampaignDesigner, sin el Cliente mezclado adentro
    // — ver docs/frontend-db-alignment.md §9.7).
    const designers: MockTeamMember[] = selectedCm.designers
      .filter((d) => designerIds.includes(d.id))
      .map((d) => ({ id: d.id, name: d.name, role: 'Diseñador', avatarBg: d.avatarBg, avatarColor: d.avatarColor }));

    onCreate(
      {
        id: `c${Date.now()}`,
        brandId,
        name: name.trim(),
        status,
        startDate: startDate || 'Sin definir',
        endDate: endDate || 'Sin definir',
        postsCount: 0,
        socialAccountIds,
        objective: objective.trim() || null,
        description: description.trim() || null,
        createdBy: user?.id ?? 'cliente',
        cmId: selectedCm.id,
      },
      designers,
    );

    setName('');
    setObjective('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setStatus('active');
    setCmId(null);
    setDesignerIds([]);
    setSocialAccountIds([]);
    onClose();
  }

  return (
    <FormDialog
      open={open}
      title="Nueva campaña"
      maxWidth="sm"
      confirmLabel="Crear"
      confirmDisabled={!name.trim() || !selectedCm || socialAccountIds.length === 0}
      onClose={onClose}
      onConfirm={handleCreate}
    >
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
      <LabeledSelect label="Estado" value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)}>
        {STATUS_OPTIONS.map((s) => (
          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
        ))}
      </LabeledSelect>

      <Divider sx={{ mb: 2.5 }} />

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Cuentas sociales que usará esta campaña</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Selecciona al menos una de las cuentas ya conectadas al perfil. Puedes agregar más después.
        </Typography>

        {availableSocialAccounts.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Este perfil todavía no tiene cuentas sociales conectadas.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {availableSocialAccounts.map((account) => {
              const active = socialAccountIds.includes(account.id);
              const network = getSocialNetwork(account.socialNetworkId);
              const color = network?.color ?? '#6B6B6B';
              return (
                <Chip
                  key={account.id}
                  label={`${network?.label ?? account.socialNetworkId} · ${account.handle}`}
                  onClick={() => toggleSocialAccount(account.id)}
                  sx={{
                    px: 2,
                    py: 3,
                    fontSize: 14,
                    fontWeight: 600,
                    border: `2px solid ${active ? color : '#E8E8E8'}`,
                    bgcolor: active ? `${color}18` : '#fff',
                    color: active ? color : '#6B6B6B',
                    cursor: 'pointer',
                    '&:hover': { borderColor: color, bgcolor: `${color}10` },
                    height: 'auto',
                  }}
                />
              );
            })}
          </Box>
        )}

        {availableSocialAccounts.length > 0 && socialAccountIds.length === 0 && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
            Selecciona al menos una cuenta social para continuar.
          </Alert>
        )}
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Elige un Community Manager</Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Mostramos primero a quienes coinciden con la categoría de tu perfil — puedes elegir libremente. Solo puedes seleccionar un CM por campaña.
        </Typography>
        <Stack gap={1}>
          {availableCMs.map((cm) => {
            const matches = cm.categories.includes(brandCategory);
            const active = cmId === cm.id;
            return (
              <Stack
                key={cm.id}
                direction="row"
                gap={1.5}
                alignItems="center"
                onClick={() => setCmId(cm.id)}
                sx={{
                  p: 1.5,
                  border: active ? '1.5px solid #E0A800' : '1px solid #E8E8E8',
                  bgcolor: active ? '#FFFDE7' : '#fff',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { borderColor: '#E0A800' },
                }}
              >
                <Avatar sx={{ bgcolor: cm.avatarBg, color: cm.avatarColor, width: 32, height: 32, fontSize: 12, fontWeight: 600 }}>
                  {getInitials(cm.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{cm.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{cm.categories.join(', ')}</Typography>
                </Box>
                {matches && (
                  <Chip size="small" label="Coincide con tu categoría" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontSize: 11 }} />
                )}
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {selectedCm && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>Diseñadores sugeridos por {selectedCm.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Estos son los diseñadores con los que {selectedCm.name} ya suele trabajar — puedes ajustar la selección.
          </Typography>
          <Stack gap={0.5}>
            {selectedCm.designers.map((d) => (
              <Stack
                key={d.id}
                direction="row"
                gap={1}
                alignItems="center"
                onClick={() => toggleDesigner(d.id)}
                sx={{ p: 1, border: '1px solid #E8E8E8', borderRadius: 2, cursor: 'pointer' }}
              >
                <Checkbox size="small" checked={designerIds.includes(d.id)} sx={{ p: 0.5 }} />
                <Avatar sx={{ bgcolor: d.avatarBg, color: d.avatarColor, width: 28, height: 28, fontSize: 11, fontWeight: 600 }}>
                  {getInitials(d.name)}
                </Avatar>
                <Typography variant="body2">{d.name}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </FormDialog>
  );
}
