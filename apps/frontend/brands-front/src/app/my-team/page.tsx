'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ConfirmDialog, EmptyState, FormDialog, PrimaryButton, useToast } from '@repo/ui/ui';
import { getInitials } from '@repo/ui/utils';
import { useListMyTeamQuery, useAddToMyTeamMutation, useRemoveFromMyTeamMutation } from '../../store/api/cm-team.api';
import { useListEligibleDesignersQuery } from '../../store/api/campaigns.api';

// Equipo GENERAL del CM (Fase J) — distinto del equipo POR CAMPAÑA
// (profile/campaigns/[campaignId]/team). Un Diseñador debe estar aquí antes
// de poder ser staffeado en una campaña puntual (CampaignsService.
// assignDesigner ya lo exige del lado del backend).
export default function MyTeamPage() {
  const { data: team = [] } = useListMyTeamQuery();
  const { data: eligibleDesigners = [] } = useListEligibleDesignersQuery();
  const [addToTeam, { isLoading: isAdding }] = useAddToMyTeamMutation();
  const [removeFromTeam] = useRemoveFromMyTeamMutation();
  const { showSuccess, showError } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ designerUserId: string; name: string } | null>(null);

  const availableDesigners = eligibleDesigners.filter((d) => !team.some((m) => m.designerUserId === d.userId));

  async function handleAdd() {
    if (!selectedDesignerId) return;
    const designer = availableDesigners.find((d) => d.userId === selectedDesignerId);
    try {
      await addToTeam(selectedDesignerId).unwrap();
      setSelectedDesignerId(null);
      setAddOpen(false);
      showSuccess(`${designer?.name ?? 'Diseñador'} agregado a tu equipo.`);
    } catch {
      showError('No se pudo agregar al equipo.');
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget) return;
    try {
      await removeFromTeam(removeTarget.designerUserId).unwrap();
      showSuccess(`${removeTarget.name} quitado de tu equipo.`);
    } catch {
      showError('No se pudo quitar del equipo.');
    } finally {
      setRemoveTarget(null);
    }
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Diseñadores</Typography>
          <Typography variant="body2" color="text.secondary">
            Diseñadores con los que trabajas — elige desde aquí a quién staffear en cada campaña.
          </Typography>
        </Box>
        <PrimaryButton
          startIcon={<PersonAddOutlinedIcon />}
          onClick={() => setAddOpen(true)}
          disabled={availableDesigners.length === 0}
        >
          Agregar Diseñador
        </PrimaryButton>
      </Stack>

      {team.length === 0 ? (
        <EmptyState
          title="Sin diseñadores en tu equipo"
          description='Usa "Agregar Diseñador" para empezar a armar tu equipo general.'
        />
      ) : (
        <Stack gap={1.5}>
          {team.map((m) => (
            <Paper key={m.designerUserId} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Avatar src={m.avatarUrl ?? undefined} sx={{ fontWeight: 700 }}>{getInitials(m.name)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{m.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Diseñador</Typography>
                </Box>
                <Tooltip title="Quitar del equipo">
                  <IconButton
                    size="small"
                    onClick={() => setRemoveTarget({ designerUserId: m.designerUserId, name: m.name })}
                    sx={{ color: '#C62828', '&:hover': { bgcolor: '#FFEBEE' } }}
                  >
                    <PersonRemoveOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <FormDialog
        open={addOpen}
        title="Agregar Diseñador"
        maxWidth="sm"
        confirmLabel={isAdding ? 'Agregando…' : 'Agregar al equipo'}
        confirmDisabled={!selectedDesignerId || isAdding}
        onClose={() => { setAddOpen(false); setSelectedDesignerId(null); }}
        onConfirm={handleAdd}
      >
        {availableDesigners.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No hay Diseñadores disponibles en este momento.</Typography>
        ) : (
          <Stack gap={1.5}>
            {availableDesigners.map((d) => {
              const isSelected = selectedDesignerId === d.userId;
              return (
                <Paper
                  key={d.userId}
                  elevation={0}
                  onClick={() => setSelectedDesignerId(isSelected ? null : d.userId)}
                  sx={{
                    p: 2,
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: 3,
                    bgcolor: isSelected ? 'primary.light' : '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Avatar src={d.avatarUrl ?? undefined} sx={{ width: 40, height: 40, fontWeight: 700 }}>
                      {getInitials(d.name)}
                    </Avatar>
                    <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>{d.name}</Typography>
                    {isSelected && <CheckCircleOutlineIcon sx={{ color: 'primary.main' }} />}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!removeTarget}
        title="Quitar del equipo"
        description={`¿Seguro que deseas quitar a ${removeTarget?.name} de tu equipo? No afecta las campañas donde ya esté asignado.`}
        confirmLabel="Quitar"
        destructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </Box>
  );
}
