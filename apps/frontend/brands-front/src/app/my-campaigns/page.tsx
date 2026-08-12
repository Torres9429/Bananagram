'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { EmptyState, FormDialog, LabeledField, PrimaryButton, useToast } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { useListCampaignsQuery, useAcceptCampaignMutation, useRejectCampaignMutation } from '../../store/api/campaigns.api';
import { CAMPAIGN_STATUS_LABEL } from '../../lib/mock-data';

// Reescrita a datos reales (Fase J) — antes usaba getMyCampaigns() (mock).
// GET /campaigns ya filtra server-side a lo que el usuario ve (dueño de la
// marca, CM asignado, o Diseñador asignado a alguna campaña).
export default function MyCampaignsPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const role = user?.roles?.[0] ?? '';
  const isCm = role === 'community_manager';

  const { data: campaigns = [] } = useListCampaignsQuery();
  const [acceptCampaign, { isLoading: isAccepting }] = useAcceptCampaignMutation();
  const [rejectCampaign, { isLoading: isRejecting }] = useRejectCampaignMutation();
  const { showSuccess, showError } = useToast();

  const pendingCampaigns = isCm ? campaigns.filter((c) => c.cmId === user?.id && c.cmStatus === 'pendiente') : [];
  const activeCampaigns = campaigns.filter((c) => !pendingCampaigns.some((p) => p.id === c.id));

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function handleAccept(id: string) {
    try {
      await acceptCampaign(id).unwrap();
      showSuccess('Campaña aceptada — ya puedes armar tu equipo desde su detalle.');
    } catch {
      showError('No se pudo aceptar la campaña.');
    }
  }

  function openReject(id: string) {
    setRejectTarget(id);
    setRejectReason('');
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    try {
      await rejectCampaign({ id: rejectTarget, reason: rejectReason.trim() || undefined }).unwrap();
      setRejectTarget(null);
      setRejectReason('');
      showSuccess('Campaña rechazada — se notificó al Cliente.');
    } catch {
      showError('No se pudo rechazar la campaña.');
    }
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Mis campañas</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Campañas en las que participas, de todas las marcas asignadas.
      </Typography>

      {isCm && pendingCampaigns.length > 0 && (
        <Box mb={4}>
          <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Pendientes de tu aprobación</Typography>
          <Stack gap={1.5}>
            {pendingCampaigns.map((c) => (
              <Paper key={c.id} elevation={0} sx={{ p: 2.5, border: '1.5px solid #E0A800', bgcolor: '#FFFDE7', borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                  <Box>
                    <Typography variant="body1" fontWeight={700}>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.startDate ?? 'Sin definir'} – {c.endDate ?? 'Sin definir'}
                      {c.objective ? ` · ${c.objective}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1}>
                    <Button size="small" color="error" variant="outlined" disabled={isRejecting} onClick={() => openReject(c.id)}>
                      Rechazar
                    </Button>
                    <PrimaryButton size="small" disabled={isAccepting} onClick={() => handleAccept(c.id)}>
                      Aceptar
                    </PrimaryButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
        {isCm && pendingCampaigns.length > 0 ? 'Resto de campañas' : 'Campañas'}
      </Typography>
      {activeCampaigns.length === 0 ? (
        <EmptyState
          title="Sin campañas asignadas"
          description="Aún no participas en ninguna campaña. El CM o el Cliente te asignarán cuando haya trabajo disponible."
        />
      ) : (
        <Stack gap={1.5}>
          {activeCampaigns.map((c) => {
            const s = CAMPAIGN_STATUS_LABEL[c.status];
            return (
              <Stack
                key={c.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => router.push(`/brands/${c.brandId}/campaigns/${c.id}`)}
                sx={{ p: 2, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.startDate ?? 'Sin definir'} – {c.endDate ?? 'Sin definir'}</Typography>
                </Box>
                <Stack direction="row" gap={1} alignItems="center">
                  {c.cmStatus === 'rechazada' && (
                    <Chip size="small" label="Rechazada por el CM" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
                  )}
                  <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}

      <FormDialog
        open={!!rejectTarget}
        title="Rechazar campaña"
        maxWidth="xs"
        confirmLabel={isRejecting ? 'Rechazando…' : 'Rechazar'}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      >
        <Typography variant="body2" color="text.secondary" mb={2}>
          El Cliente verá este motivo y podrá elegir a otro Community Manager para la campaña.
        </Typography>
        <LabeledField
          label="Motivo (opcional)"
          placeholder="Ej. No tengo disponibilidad este mes"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          multiline
          rows={2}
        />
      </FormDialog>
    </Box>
  );
}
