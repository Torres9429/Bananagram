'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ConfirmDialog, EmptyState, FormDialog, PrimaryButton, useToast } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { getInitials } from '@repo/ui/utils';
import {
  useGetCampaignQuery,
  useListEligibleCMsQuery,
  useListEligibleDesignersQuery,
  useAssignDesignerMutation,
  useRemoveDesignerMutation,
} from '../../../../../../store/api/campaigns.api';
import { useListMyTeamQuery } from '../../../../../../store/api/cm-team.api';

// Fase M: movida desde /profile/campaigns/[campaignId]/team (borrada, no hay
// segunda copia) — mismo criterio del padre. Equipo POR CAMPAÑA: Cliente + CM
// + los Diseñadores que el CM eligió para ESTA campaña, tomados de su equipo
// GENERAL (Mi equipo / cm-team.api.ts) — no de todos los Diseñadores
// elegibles del sistema. Solo el CM asignado gestiona (agregar/quitar), y
// solo si ya aceptó la campaña (CampaignsService.assignDesigner lo exige).
export default function CampaignTeamPage() {
  const router = useRouter();
  const params = useParams<{ id: string; campaignId: string }>();
  const user = useSelector(selectUser);
  const role = user?.roles?.[0] ?? '';
  const isCm = role === 'community_manager';

  const { data: campaign } = useGetCampaignQuery(params.campaignId);
  const { data: allCMs = [] } = useListEligibleCMsQuery([]);
  const { data: allDesigners = [] } = useListEligibleDesignersQuery();
  const { data: myRoster = [] } = useListMyTeamQuery(undefined, { skip: !isCm });
  const [assignDesigner, { isLoading: isAssigning }] = useAssignDesignerMutation();
  const [removeDesigner] = useRemoveDesignerMutation();
  const { showSuccess, showError } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  if (!campaign) return null;

  const cm = allCMs.find((c) => c.userId === campaign.cmId) ?? null;
  const assignedDesigners = (campaign.designers ?? []).map((d) => {
    const profile = allDesigners.find((ed) => ed.userId === d.userId);
    return { userId: d.userId, name: profile?.name ?? 'Usuario', avatarUrl: profile?.avatarUrl ?? null };
  });

  const canManage = isCm && campaign.cmId === user?.id && campaign.cmStatus === 'aceptada';
  const availableFromRoster = myRoster.filter((m) => !assignedDesigners.some((a) => a.userId === m.designerUserId));
  const totalMembers = assignedDesigners.length + (cm ? 1 : 0);

  async function handleAddDesigner() {
    if (!selectedDesignerId) return;
    const designer = availableFromRoster.find((d) => d.designerUserId === selectedDesignerId);
    try {
      await assignDesigner({ campaignId: params.campaignId, userId: selectedDesignerId }).unwrap();
      setSelectedDesignerId(null);
      setAddOpen(false);
      showSuccess(`${designer?.name ?? 'Diseñador'} agregado a la campaña.`);
    } catch {
      showError('No se pudo agregar al Diseñador.');
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    try {
      await removeDesigner({ campaignId: params.campaignId, userId: removeTarget.userId }).unwrap();
      showSuccess(`${removeTarget.name} quitado de la campaña.`);
    } catch {
      showError('No se pudo quitar al Diseñador.');
    } finally {
      setRemoveTarget(null);
    }
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', px: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tooltip title="Volver a la campaña">
            <IconButton onClick={() => router.push(`/brands/${params.id}/campaigns/${params.campaignId}`)} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Equipo — {campaign.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalMembers} {totalMembers === 1 ? 'integrante' : 'integrantes'}
            </Typography>
          </Box>
          {isCm && (
            <PrimaryButton
              startIcon={<PersonAddOutlinedIcon />}
              onClick={() => setAddOpen(true)}
              disabled={!canManage || availableFromRoster.length === 0}
            >
              Agregar Diseñador
            </PrimaryButton>
          )}
        </Stack>

        {isCm && campaign.cmId === user?.id && campaign.cmStatus !== 'aceptada' && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Todavía no aceptaste esta campaña — acéptala desde "Mis campañas" para poder armar el equipo.
          </Alert>
        )}

        {assignedDesigners.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Esta campaña aún no tiene Diseñadores asignados.
          </Alert>
        )}

        {cm && (
          <Box mb={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Community Manager
            </Typography>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Avatar src={cm.avatarUrl ?? undefined} sx={{ fontWeight: 700 }}>
                  {getInitials(cm.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{cm.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Coordinador de la campaña</Typography>
                </Box>
                <Chip size="small" label="CM" sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
              </Stack>
            </Paper>
          </Box>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Diseñadores ({assignedDesigners.length})
          </Typography>
          {assignedDesigners.length === 0 ? (
            <EmptyState
              title="Sin diseñadores"
              description={isCm ? 'Usa "Agregar Diseñador" para incorporar a tu equipo.' : 'El Community Manager todavía no asignó diseñadores.'}
            />
          ) : (
            <Stack gap={1.5}>
              {assignedDesigners.map((member) => (
                <Paper key={member.userId} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <Stack direction="row" gap={2} alignItems="center">
                    <Avatar src={member.avatarUrl ?? undefined} sx={{ fontWeight: 700 }}>
                      {getInitials(member.name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{member.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Diseñador</Typography>
                    </Box>
                    {canManage && (
                      <Tooltip title="Quitar de la campaña">
                        <IconButton
                          size="small"
                          onClick={() => setRemoveTarget({ userId: member.userId, name: member.name })}
                          sx={{ color: '#C62828', '&:hover': { bgcolor: '#FFEBEE' } }}
                        >
                          <PersonRemoveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      <FormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setSelectedDesignerId(null); }}
        title="Agregar Diseñador"
        confirmLabel={isAssigning ? 'Agregando…' : 'Agregar al equipo'}
        onConfirm={handleAddDesigner}
        confirmDisabled={!selectedDesignerId || isAssigning}
        maxWidth="sm"
      >
        <Typography variant="body2" color="text.secondary" mb={2}>
          Solo se ofrecen Diseñadores que ya están en tu equipo general.
        </Typography>

        {availableFromRoster.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No tienes Diseñadores disponibles en tu equipo general — agrégalos primero desde "Mi equipo".
          </Alert>
        ) : (
          <Stack gap={1.5}>
            {availableFromRoster.map((d) => {
              const isSelected = selectedDesignerId === d.designerUserId;
              return (
                <Paper
                  key={d.designerUserId}
                  elevation={0}
                  onClick={() => setSelectedDesignerId(isSelected ? null : d.designerUserId)}
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
        description={`¿Seguro que deseas quitar a ${removeTarget?.name} de esta campaña? No afecta sus otras campañas ni su cuenta en el sistema.`}
        confirmLabel="Quitar"
        destructive
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveTarget(null)}
      />
    </Box>
  );
}
