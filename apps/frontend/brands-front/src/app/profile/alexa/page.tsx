'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MicOutlinedIcon from '@mui/icons-material/MicOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { EmptyState, LabeledSelect, PrimaryButton, useToast } from '@repo/ui/ui';
import { selectUser, useCreateLinkCodeMutation } from '@repo/ui/state';
import { useListCampaignsQuery } from '../../../store/api/campaigns.api';
import { useListIdeasByCampaignQuery, useDeleteIdeaMutation } from '../../../store/api/ideas.api';

// Solo Cliente y Diseñador por ahora (decisión del usuario) — el backend ya
// lo exige aparte para generar el código (auth.service.ts.createLinkCode,
// 403 para otros roles); esto solo decide si la pantalla existe.
function useCanUseAlexaSkill(): boolean {
  const user = useSelector(selectUser);
  const roles = user?.roles ?? [];
  return roles.includes('cliente') || roles.includes('disenador');
}

function LinkCodeSection() {
  const { showError } = useToast();
  const [createLinkCode, { data, isLoading }] = useCreateLinkCodeMutation();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.expiresAt) return;
    const tick = () => {
      const remaining = Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(remaining > 0 ? remaining : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.expiresAt]);

  const expired = secondsLeft === 0;

  async function handleGenerate() {
    try {
      await createLinkCode().unwrap();
    } catch {
      showError('No se pudo generar el código. Intenta de nuevo.');
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Stack direction="row" gap={1.5} alignItems="center" mb={1}>
        <MicOutlinedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle1" fontWeight={700}>Vincular con Alexa</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Genera un código, dile a Alexa &quot;vincula mi cuenta de Bananagram&quot; y dictáselo cuando te lo pida.
      </Typography>

      {!data || expired ? (
        <PrimaryButton onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? 'Generando…' : expired ? 'Generar otro código' : 'Generar código'}
        </PrimaryButton>
      ) : (
        <Stack alignItems="flex-start" gap={1}>
          <Typography variant="h3" fontWeight={800} letterSpacing={4} sx={{ color: 'primary.main' }}>
            {data.code}
          </Typography>
          <Chip
            size="small"
            label={secondsLeft !== null ? `Expira en ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : ''}
            sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
          />
        </Stack>
      )}
    </Paper>
  );
}

function SavedIdeasSection() {
  const { showSuccess, showError } = useToast();
  const { data: campaigns = [] } = useListCampaignsQuery();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const activeCampaignId = campaignId ?? campaigns[0]?.id ?? null;

  const { data: ideas = [] } = useListIdeasByCampaignQuery(activeCampaignId ?? '', { skip: !activeCampaignId });
  const [deleteIdea] = useDeleteIdeaMutation();

  async function handleDelete(id: string) {
    try {
      await deleteIdea(id).unwrap();
      showSuccess('Idea eliminada.');
    } catch {
      showError('No se pudo eliminar la idea.');
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Stack direction="row" gap={1.5} alignItems="center" mb={1}>
        <LightbulbOutlinedIcon sx={{ color: 'primary.main' }} />
        <Typography variant="subtitle1" fontWeight={700}>Ideas guardadas</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Ideas de contenido que dictaste o guardaste por voz. Desde aquí solo se pueden ver y borrar.
      </Typography>

      {campaigns.length === 0 ? (
        <EmptyState title="Sin campañas todavía" description="Las ideas se guardan por campaña — necesitas al menos una." />
      ) : (
        <>
          {campaigns.length > 1 && (
            <LabeledSelect
              label="Campaña"
              value={activeCampaignId ?? ''}
              onChange={(e) => setCampaignId((e.target.value as string) || null)}
              sx={{ mb: 2, maxWidth: 320 }}
            >
              {campaigns.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </LabeledSelect>
          )}

          {ideas.length === 0 ? (
            <EmptyState title="Sin ideas guardadas en esta campaña" description="Pídele a Alexa ideas de contenido para verlas aquí." />
          ) : (
            <Stack gap={1.5}>
              {ideas.map((idea) => (
                <Stack
                  key={idea.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  gap={1.5}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    {idea.title && <Typography variant="body2" fontWeight={700}>{idea.title}</Typography>}
                    <Typography variant="body2" color="text.secondary">{idea.text}</Typography>
                    <Stack direction="row" gap={1} mt={0.5}>
                      <Chip size="small" label={idea.source === 'sugerida' ? 'Generada por IA' : 'Dictada'} sx={{ bgcolor: '#F5F5F5', color: '#616161' }} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(idea.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton size="small" onClick={() => handleDelete(idea.id)} sx={{ color: '#C62828', flexShrink: 0 }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}

export default function AlexaSkillPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const canUse = useCanUseAlexaSkill();

  if (!user) return null;

  const backButton = (
    <Tooltip title="Volver a mi perfil">
      <IconButton
        onClick={() => router.push('/profile')}
        sx={{ mb: 2, color: 'secondary.main', bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFF8E1' } }}
      >
        <ArrowBackIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  if (!canUse) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
        {backButton}
        <EmptyState title="No disponible para tu rol" description="La Skill de Alexa por ahora solo está disponible para Cliente y Diseñador." />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      {backButton}
      <Typography variant="h5" fontWeight={700} mb={1}>Alexa Skill</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Vincula tu cuenta y consulta las ideas que guardaste por voz.
      </Typography>
      <LinkCodeSection />
      <SavedIdeasSection />
    </Box>
  );
}
