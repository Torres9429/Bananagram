'use client';

import { useEffect } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAnalyzePostMutation } from '../store/api/ai.api';

interface Props {
  postId: string;
  /** Limpia el resultado cuando el panel deja de estar visible (cambio de tab/colapso) — nunca dispara el análisis solo. */
  active: boolean;
}

// Mismos umbrales que core-service/src/score/score.service.ts (≤40 bajo,
// ≤70 medio, >70 alto) — solo para colorear el chip, no representa el Score
// digital real de la marca (son conceptos distintos, no hay que confundirlos).
const SCORE_COLORS: Record<'bajo' | 'medio' | 'alto', string> = { bajo: '#C62828', medio: '#E65100', alto: '#2E7D32' };
function scoreLabel(score: number): 'bajo' | 'medio' | 'alto' {
  if (score <= 40) return 'bajo';
  if (score <= 70) return 'medio';
  return 'alto';
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
  return 'No se pudo analizar la publicación. Intenta de nuevo.';
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" mb={0.5}>{title}</Typography>
      <Stack gap={0.5}>
        {items.map((item, i) => (
          <Typography key={i} variant="body2">• {item}</Typography>
        ))}
      </Stack>
    </Box>
  );
}

// "Analizar con IA" — publicaciones:ver: es de solo lectura, no modifica el
// post. Antes vivía en un Dialog modal (AnalyzePostDialog, retirado
// 2026-08-19) — ahora es un panel embebido dentro de AiAssistantSection.
// A propósito NO dispara la petición sola al abrirse (2026-08-19: pedido
// explícito de no gastar una llamada a OpenRouter sin que el usuario lo
// pida) — requiere el botón "Analizar publicación".
export function AnalyzePostPanel({ postId, active }: Props) {
  const [analyzePost, { data, isLoading, error, reset }] = useAnalyzePostMutation();

  useEffect(() => {
    if (!active) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, postId]);

  const label = data ? scoreLabel(data.score) : undefined;

  return (
    <Stack gap={2}>
      {!data && !isLoading && (
        <Box>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon fontSize="small" />}
            onClick={() => analyzePost({ postId })}
          >
            Analizar publicación
          </Button>
        </Box>
      )}

      {isLoading && (
        <Stack alignItems="center" gap={1.5} py={4}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">Analizando publicación…</Typography>
        </Stack>
      )}
      {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
      {data && (
        <>
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
            <Chip
              label={`Evaluación de IA: ${label}`}
              sx={{ bgcolor: `${SCORE_COLORS[label!]}1A`, color: SCORE_COLORS[label!], fontWeight: 700 }}
            />
            <Typography variant="caption" color="text.secondary">
              Evaluación cualitativa generada por IA — no es una predicción estadística de rendimiento.
            </Typography>
          </Stack>
          <Typography variant="body2">{data.summary}</Typography>
          <Section title="Fortalezas" items={data.strengths} />
          <Section title="Debilidades" items={data.weaknesses} />
          <Section title="Recomendaciones" items={data.recommendations} />
          {data.hashtagAnalysis && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Hashtags</Typography>
              <Typography variant="body2">{data.hashtagAnalysis}</Typography>
            </Box>
          )}
          <Section title="Recomendaciones visuales" items={data.visualRecommendations ?? []} />
          <Box>
            <Button size="small" variant="outlined" onClick={() => reset()} sx={{ color: '#6B6B6B', borderColor: '#E8E8E8' }}>
              Analizar de nuevo
            </Button>
          </Box>
        </>
      )}
    </Stack>
  );
}
