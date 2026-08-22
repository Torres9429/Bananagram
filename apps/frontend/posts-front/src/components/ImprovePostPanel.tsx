'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { LabeledSelect } from '@repo/ui/ui';
import { useImprovePostMutation, type ImprovePostAction } from '../store/api/ai.api';

interface Props {
  postId: string;
  /** Limpia el resultado cuando el panel deja de estar visible (cambio de tab/colapso). */
  active: boolean;
  /** El caller decide qué hacer con el texto elegido — nunca se sobrescribe la publicación automáticamente aquí. */
  onApply: (improvedText: string) => void;
}

const ACTION_OPTIONS: { value: ImprovePostAction; label: string }[] = [
  { value: 'mejorar', label: 'Mejorar redacción' },
  { value: 'variantes', label: 'Generar variantes' },
  { value: 'hashtags', label: 'Sugerir hashtags' },
  { value: 'adaptar', label: 'Adaptar a otra plataforma' },
];

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  }
  return 'No se pudo generar la propuesta. Intenta de nuevo.';
}

// "Mejorar con IA" — publicaciones:editar: sí propone una reescritura, pero
// NUNCA sobrescribe el post por sí sola. "Usar esta propuesta"/"Usar esta
// variante" solo entregan el texto al caller (page.tsx), que lo precarga en
// el formulario de edición existente — el usuario todavía tiene que darle
// "Guardar" ahí para persistirlo. Antes vivía en un Dialog modal
// (ImprovePostDialog, retirado 2026-08-19) — ahora es un panel embebido
// dentro de AiAssistantSection.
export function ImprovePostPanel({ postId, active, onApply }: Props) {
  const [action, setAction] = useState<ImprovePostAction>('mejorar');
  const [targetPlatform, setTargetPlatform] = useState('');
  const [improvePost, { data, isLoading, error, reset }] = useImprovePostMutation();

  // Limpia el resultado (no el action/targetPlatform elegido) cuando el
  // usuario se va del panel — evita mostrar una propuesta vieja al volver.
  useEffect(() => {
    if (!active) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function handleGenerate() {
    improvePost({ postId, action, targetPlatform: action === 'adaptar' ? targetPlatform.trim() || undefined : undefined });
  }

  function handleApply(text: string) {
    onApply(text);
    reset();
  }

  return (
    <Stack gap={2}>
      {!data && !isLoading && (
        <Stack gap={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'flex-end' }}>
            <LabeledSelect label="¿Qué necesitas?" value={action} onChange={(e) => setAction(e.target.value as ImprovePostAction)} sx={{ minWidth: 220 }}>
              {ACTION_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </LabeledSelect>
            {action === 'adaptar' && (
              <TextField
                label="Plataforma destino"
                placeholder="ej. tiktok"
                fullWidth
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value)}
              />
            )}
            <Button
              variant="contained"
              disabled={action === 'adaptar' && !targetPlatform.trim()}
              onClick={handleGenerate}
              sx={{ flexShrink: 0 }}
            >
              Generar
            </Button>
          </Stack>
        </Stack>
      )}

      {isLoading && (
        <Stack alignItems="center" gap={1.5} py={4}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">Generando propuesta…</Typography>
        </Stack>
      )}

      {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <Stack gap={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Original</Typography>
            <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 1.5 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{data.original}</Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Propuesta de IA</Typography>
            <Box sx={{ bgcolor: '#FFF8E1', border: '1px solid #E0A800', borderRadius: 2, p: 1.5 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{data.improved}</Typography>
            </Box>
            <Button size="small" sx={{ mt: 1, color: 'secondary.main' }} onClick={() => handleApply(data.improved)}>
              Usar esta propuesta →
            </Button>
          </Box>

          {data.changes.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Qué cambió</Typography>
              <Stack gap={0.5}>
                {data.changes.map((c, i) => <Typography key={i} variant="body2">• {c}</Typography>)}
              </Stack>
            </Box>
          )}

          {data.variants && data.variants.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Variantes adicionales</Typography>
              <Stack gap={1}>
                {data.variants.map((variant, i) => (
                  <Box key={i} sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 1.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{variant}</Typography>
                    <Button size="small" sx={{ color: 'secondary.main' }} onClick={() => handleApply(variant)}>
                      Usar esta variante →
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {data.suggestedHashtags && data.suggestedHashtags.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Hashtags sugeridos</Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {data.suggestedHashtags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Stack>
            </Box>
          )}

          <Box>
            <Button size="small" variant="outlined" onClick={() => reset()} sx={{ color: '#6B6B6B', borderColor: '#E8E8E8' }}>
              Generar otra propuesta
            </Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
