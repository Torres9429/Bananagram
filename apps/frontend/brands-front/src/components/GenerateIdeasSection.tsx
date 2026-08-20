'use client';

import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useGenerateIdeasMutation } from '../store/api/ai.api';

interface Props {
  campaignId: string;
  brandName?: string;
  category?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  }
  return 'No se pudieron generar ideas. Intenta de nuevo.';
}

const INITIAL_VISIBLE_COUNT = 2;

// "Generar ideas con IA" — antes un Dialog modal (GenerateIdeasDialog,
// retirado 2026-08-20), ahora una sección contraible en la misma pantalla,
// mismo patrón que AiAssistantSection/SuggestCaptionPanel (posts-front): un
// modal tapaba el resto del detalle de campaña (equipo, métricas) mientras
// se generaban ideas, obligando a cerrarlo para volver a ver el contexto.
// Gateado por ideas:crear (módulo propio, ver ai-service/ai.controller.ts)
// desde donde se renderiza — no persiste nada, el usuario copia lo que le
// sirva a mano.
//
// Las ideas generadas se conservan mientras el componente siga montado —
// colapsar/expandir el Accordion ya NO las borra (antes sí, feedback real:
// perdías las ideas solo por cerrar la sección sin querer). Solo se limpian
// al pedir explícitamente "Generar otras ideas" o al salir de la pantalla
// (el propio unmount de React resetea el estado, no hace falta un efecto
// aparte para eso).
export function GenerateIdeasSection({ campaignId, brandName, category }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [generateIdeas, { data, isLoading, error, reset }] = useGenerateIdeasMutation();

  function handleGenerate() {
    if (!platform.trim()) return;
    setShowAll(false);
    generateIdeas({
      campaignId,
      platform: platform.trim(),
      brandName,
      category,
      description: description.trim() || undefined,
      audience: audience.trim() || undefined,
      tone: tone.trim() || undefined,
    });
  }

  function handleGenerateMore() {
    setShowAll(false);
    reset();
  }

  const visibleIdeas = data && (showAll ? data.ideas : data.ideas.slice(0, INITIAL_VISIBLE_COUNT));
  const hiddenCount = data ? data.ideas.length - INITIAL_VISIBLE_COUNT : 0;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      elevation={0}
      disableGutters
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        mb: 3,
        overflow: 'hidden',
        '&:before': { display: 'none' },
        '&.Mui-expanded': { margin: 0, marginBottom: 3 },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, '&.Mui-expanded': { minHeight: 48 } }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" sx={{ color: '#6A1B9A' }} />
          <Typography variant="subtitle1" fontWeight={700}>Generar ideas con IA</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
        {!data && !isLoading && (
          <Stack gap={2}>
            <TextField
              label="Red social objetivo"
              placeholder="ej. instagram, tiktok"
              required
              fullWidth
              size="small"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
            <TextField
              label="Descripción del objetivo (opcional)"
              multiline
              minRows={2}
              fullWidth
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField label="Audiencia (opcional)" fullWidth size="small" value={audience} onChange={(e) => setAudience(e.target.value)} />
            <TextField
              label="Tono de comunicación (opcional)"
              placeholder="ej. cercano, profesional, divertido"
              fullWidth
              size="small"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" size="small" disabled={!platform.trim()} onClick={handleGenerate}>
                Generar
              </Button>
            </Stack>
          </Stack>
        )}

        {isLoading && (
          <Stack alignItems="center" gap={1.5} py={4}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">Generando ideas…</Typography>
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mt: isLoading ? 0 : 2 }}>{getErrorMessage(error)}</Alert>}

        {visibleIdeas && (
          <Stack gap={2}>
            {visibleIdeas.map((idea, i) => (
              <Box key={i} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1} gap={1}>
                  <Typography variant="subtitle2" fontWeight={700}>{idea.title}</Typography>
                  {idea.suggestedFormat && <Chip size="small" label={idea.suggestedFormat} />}
                </Stack>
                <Typography variant="body2" mb={1}>{idea.concept}</Typography>
                {idea.hook && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Hook: {idea.hook}
                  </Typography>
                )}
                {idea.callToAction && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    CTA: {idea.callToAction}
                  </Typography>
                )}
              </Box>
            ))}
            <Stack direction="row" gap={1.5} flexWrap="wrap">
              {hiddenCount > 0 && (
                <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ color: 'secondary.main' }}>
                  {showAll ? 'Ver menos' : `Ver más (${hiddenCount})`}
                </Button>
              )}
              <Button size="small" variant="outlined" onClick={handleGenerateMore} sx={{ color: '#6B6B6B', borderColor: 'divider' }}>
                Generar otras ideas
              </Button>
            </Stack>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
