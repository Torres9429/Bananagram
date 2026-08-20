'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGenerateIdeasMutation } from '../store/api/ai.api';

interface Props {
  open: boolean;
  campaignId: string;
  brandName?: string;
  category?: string;
  onClose: () => void;
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

// "Generar ideas con IA" — gateado por ideas:crear (módulo propio desde
// 2026-08-19, separado de campanas:crear específicamente para que Diseñador
// pueda usarlo sin necesitar campanas:crear — ver
// alexa-service/ideas.controller.ts / ai-service/ai.controller.ts). No
// persiste nada — ai-service no guarda ideas en BD, el usuario copia lo que
// le sirva a mano (fuera de alcance de esta primera versión guardar/editar
// desde acá).
export function GenerateIdeasDialog({ open, campaignId, brandName, category, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [platform, setPlatform] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [generateIdeas, { data, isLoading, error, reset }] = useGenerateIdeasMutation();

  function handleClose() {
    reset();
    setPlatform('');
    setDescription('');
    setAudience('');
    setTone('');
    onClose();
  }

  function handleGenerate() {
    if (!platform.trim()) return;
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle
        sx={(theme) => ({ position: 'relative', bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, fontWeight: 700, pr: 6 })}
      >
        Generar ideas con IA
        <IconButton
          onClick={handleClose}
          size="medium"
          sx={(theme) => ({ position: 'absolute', top: 8, right: 8, color: theme.palette.primary.contrastText })}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {!data && !isLoading && (
          <Stack gap={2}>
            <TextField
              label="Red social objetivo"
              placeholder="ej. instagram, tiktok"
              required
              fullWidth
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
            <TextField
              label="Descripción del objetivo (opcional)"
              multiline
              minRows={2}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField label="Audiencia (opcional)" fullWidth value={audience} onChange={(e) => setAudience(e.target.value)} />
            <TextField
              label="Tono de comunicación (opcional)"
              placeholder="ej. cercano, profesional, divertido"
              fullWidth
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </Stack>
        )}

        {isLoading && (
          <Stack alignItems="center" gap={1.5} py={4}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">Generando ideas…</Typography>
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ mt: isLoading ? 0 : 2 }}>{getErrorMessage(error)}</Alert>}

        {data && (
          <Stack gap={2}>
            {data.ideas.map((idea, i) => (
              <Box key={i} sx={{ border: '1px solid #E8E8E8', borderRadius: 2, p: 2 }}>
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
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {!data && !isLoading && (
          <Button onClick={handleGenerate} variant="contained" disabled={!platform.trim()}>
            Generar
          </Button>
        )}
        <Button onClick={handleClose} variant="outlined">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
