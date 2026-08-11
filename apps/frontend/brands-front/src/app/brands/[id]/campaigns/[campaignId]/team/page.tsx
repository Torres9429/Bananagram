'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ConfirmDialog, EmptyState, FormDialog, ProtectedAction, PrimaryButton } from '@repo/ui/ui';
import { getInitials } from '@repo/ui/utils';
import { CampaignTabs } from '../../../../../../components/CampaignTabs';
import {
  MOCK_PROFILES,
  MOCK_CAMPAIGNS,
  MOCK_CAMPAIGN_DESIGNERS,
  getCampaignCM,
  getAvailableDesigners,
  assignTeamToCampaign,
} from '../../../../../../lib/mock-data';
import type { MockTeamMember } from '../../../../../../interfaces/interface';

export default function CampaignTeamPage() {
  const params = useParams<{ id: string; campaignId: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === params.campaignId) ?? MOCK_CAMPAIGNS[0];

  // El CM ya no vive en el mismo arreglo que los Diseñadores (Campaign.cmId
  // es una FK única, no un team member más) — se resuelve aparte y no
  // participa en el flujo de Agregar/Quitar Diseñador de abajo.
  const cm = getCampaignCM(campaign.id);
  const [designers, setDesigners] = useState<MockTeamMember[]>(MOCK_CAMPAIGN_DESIGNERS[campaign.id] ?? []);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MockTeamMember | null>(null);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);

  const availableDesigners = getAvailableDesigners().filter(
    (d) => !designers.some((m) => m.id === d.id),
  );

  const totalMembers = designers.length + (cm ? 1 : 0);

  function handleAddDesigner() {
    if (!selectedDesignerId) return;
    const designer = availableDesigners.find((d) => d.id === selectedDesignerId);
    if (!designer) return;

    const newMember: MockTeamMember = {
      id: designer.id,
      name: designer.name,
      role: 'Diseñador',
      avatarBg: designer.avatarBg,
      avatarColor: designer.avatarColor,
    };

    const updated = [...designers, newMember];
    setDesigners(updated);
    assignTeamToCampaign(campaign.id, updated);
    setSelectedDesignerId(null);
    setAddOpen(false);
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    const updated = designers.filter((m) => m.id !== removeTarget.id);
    setDesigners(updated);
    assignTeamToCampaign(campaign.id, updated);
    setRemoveTarget(null);
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <CampaignTabs brandId={brand.id} campaignId={campaign.id} backHref="/my-campaigns" />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Equipo — {campaign.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {totalMembers} {totalMembers === 1 ? 'integrante' : 'integrantes'} · {brand.name}
            </Typography>
          </Box>
          <ProtectedAction module="publicaciones" action="editar">
            <PrimaryButton
              startIcon={<PersonAddOutlinedIcon />}
              onClick={() => setAddOpen(true)}
              disabled={availableDesigners.length === 0}
            >
              Agregar Diseñador
            </PrimaryButton>
          </ProtectedAction>
        </Stack>

        {designers.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Esta campaña aún no tiene Diseñadores asignados. Agrega al menos uno para empezar a producir contenido.
          </Alert>
        )}

        {/* Community Manager */}
        {cm && (
          <Box mb={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Community Manager
            </Typography>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #E8E8E8', borderRadius: 3 }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Avatar sx={{ bgcolor: cm.avatarBg, color: cm.avatarColor, fontWeight: 700 }}>
                  {getInitials(cm.name)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{cm.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Coordinador de la campaña</Typography>
                </Box>
                <Chip size="small" label="CM" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 700 }} />
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Diseñadores */}
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Diseñadores ({designers.length})
          </Typography>
          {designers.length === 0 ? (
            <EmptyState
              title="Sin diseñadores"
              description='Usa el botón "Agregar Diseñador" para incorporar a tu equipo.'
            />
          ) : (
            <Stack gap={1.5}>
              {designers.map((member) => (
                <Paper key={member.id} elevation={0} sx={{ p: 2, border: '1px solid #E8E8E8', borderRadius: 3 }}>
                  <Stack direction="row" gap={2} alignItems="center">
                    <Avatar sx={{ bgcolor: member.avatarBg, color: member.avatarColor, fontWeight: 700 }}>
                      {getInitials(member.name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{member.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                    </Box>
                    <ProtectedAction module="publicaciones" action="editar">
                      <Tooltip title="Quitar de la campaña">
                        <IconButton
                          size="small"
                          onClick={() => setRemoveTarget(member)}
                          sx={{ color: '#C62828', '&:hover': { bgcolor: '#FFEBEE' } }}
                        >
                          <PersonRemoveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ProtectedAction>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Dialog: agregar diseñador */}
      <FormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setSelectedDesignerId(null); }}
        title="Agregar Diseñador"
        confirmLabel="Agregar al equipo"
        onConfirm={handleAddDesigner}
        confirmDisabled={!selectedDesignerId}
        maxWidth="sm"
      >
        <Typography variant="body2" color="text.secondary" mb={2}>
          Solo aparecen Diseñadores con perfil completo y disponibilidad activa.
        </Typography>

        {availableDesigners.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No hay Diseñadores disponibles en este momento. Consulta al Administrador para activar perfiles.
          </Alert>
        ) : (
          <Stack gap={1.5}>
            {availableDesigners.map((d) => {
              const isSelected = selectedDesignerId === d.id;
              return (
                <Paper
                  key={d.id}
                  elevation={0}
                  onClick={() => setSelectedDesignerId(isSelected ? null : d.id)}
                  sx={{
                    p: 2,
                    border: `2px solid ${isSelected ? '#E0A800' : '#E8E8E8'}`,
                    borderRadius: 3,
                    bgcolor: isSelected ? '#FFF8E1' : '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#E0A800' },
                  }}
                >
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: d.avatarBg, color: d.avatarColor, width: 40, height: 40, fontWeight: 700 }}>
                      {getInitials(d.name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{d.name}</Typography>
                      <Stack direction="row" gap={0.5} mt={0.5} flexWrap="wrap">
                        {d.specialties.map((sp: string) => (
                          <Chip key={sp} label={sp} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        ))}
                      </Stack>
                    </Box>
                    {isSelected && <CheckCircleOutlineIcon sx={{ color: '#E0A800' }} />}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </FormDialog>

      {/* Dialog: confirmar eliminar */}
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
