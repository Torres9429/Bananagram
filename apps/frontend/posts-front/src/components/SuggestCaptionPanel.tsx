'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useSuggestCaptionMutation } from '../store/api/ai.api';

interface Props {
  platform: string;
  /** Archivos ya adjuntados en el formulario — solo las imágenes se envían a la IA (los videos no aplican a visión). */
  files: File[];
  /** Limpia el resultado cuando el panel deja de estar visible (colapsado). */
  active: boolean;
  /** El caller decide qué hacer con la sugerencia elegida — nunca se autocompleta el campo de contenido sin que el usuario elija. */
  onApply: (text: string) => void;
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
  return 'No se pudieron generar sugerencias. Intenta de nuevo.';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// "Sugerir descripción con IA" — publicaciones:crear: no hay postId, la
// publicación todavía no existe. Antes vivía en un Dialog modal
// (SuggestCaptionDialog, retirado 2026-08-19) — ahora es un panel embebido
// en la misma pantalla de /posts/new, debajo del campo "Contenido", que se
// abre/cierra con el mismo botón "Sugerir con IA" (ver page.tsx).
export function SuggestCaptionPanel({ platform, files, active, onApply }: Props) {
  const [brief, setBrief] = useState('');
  const [suggestCaption, { data, isLoading, error, reset }] = useSuggestCaptionMutation();
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!active) {
      reset();
      setBrief('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const imageFiles = files.filter((f) => f.type.startsWith('image/'));

  async function handleGenerate() {
    setConverting(true);
    try {
      const images = await Promise.all(imageFiles.slice(0, 3).map(fileToDataUrl));
      await suggestCaption({ platform, brief: brief.trim() || undefined, images: images.length ? images : undefined });
    } finally {
      setConverting(false);
    }
  }

  function handleApply(text: string) {
    onApply(text);
    reset();
    setBrief('');
  }

  const canGenerate = (brief.trim().length > 0 || imageFiles.length > 0) && !!platform;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', border: '1px solid #E8E8E8', borderRadius: 2, p: 2 }}>
      {!data && !isLoading && !converting && (
        <Stack gap={1.5}>
          {!platform && <Alert severity="info">Selecciona al menos una red social para continuar.</Alert>}
          <TextField
            label="¿De qué trata la publicación? (opcional si adjuntaste imágenes)"
            placeholder="ej. lanzamiento de nuestro nuevo sabor de temporada"
            multiline
            minRows={2}
            fullWidth
            size="small"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            sx={{ bgcolor: '#fff' }}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary">
              {imageFiles.length > 0
                ? `Se analizarán ${Math.min(imageFiles.length, 3)} de ${imageFiles.length} imagen(es) ya adjuntas.`
                : 'Sin imágenes adjuntas todavía — adjúntalas antes si quieres que la IA las analice.'}
            </Typography>
            <Button variant="contained" size="small" disabled={!canGenerate} onClick={handleGenerate}>
              Generar
            </Button>
          </Stack>
        </Stack>
      )}

      {(isLoading || converting) && (
        <Stack alignItems="center" gap={1.5} py={3}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">Generando sugerencias…</Typography>
        </Stack>
      )}

      {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}

      {data && (
        <Stack gap={1.5}>
          {data.suggestions.map((suggestion, i) => (
            <Box key={i} sx={{ bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 2, p: 1.5 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{suggestion}</Typography>
              <Button size="small" sx={{ color: 'secondary.main' }} onClick={() => handleApply(suggestion)}>
                Usar esta opción →
              </Button>
            </Box>
          ))}
          <Box>
            <Button size="small" variant="outlined" onClick={() => reset()} sx={{ color: '#6B6B6B', borderColor: '#E8E8E8' }}>
              Generar otras opciones
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
