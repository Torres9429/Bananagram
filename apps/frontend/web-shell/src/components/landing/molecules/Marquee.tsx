'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { motion, useReducedMotion } from 'framer-motion';
import type { MarqueeProps } from '../../../interfaces/interface';

// Cada "mitad" se repite varias veces para garantizar que sea más ancha que
// cualquier viewport real (si no, en pantallas anchas el contenido se acaba
// antes de completar el loop y deja un hueco en blanco).
const HALF_REPEATS = 6;

/** Cinta dorada con scroll infinito de logos/redes, al pie del Hero (como la referencia). */
export function Marquee({ items }: MarqueeProps) {
  const reduceMotion = useReducedMotion();
  const half = Array.from({ length: HALF_REPEATS }, () => items).flat();
  const doubled = [...half, ...half];

  return (
    <Box sx={{ bgcolor: 'primary.main', py: 1.5, overflow: 'hidden' }}>
      <Box
        component={motion.div}
        animate={reduceMotion ? undefined : { x: ['0%', '-50%'] }}
        transition={reduceMotion ? undefined : { duration: 60, repeat: Infinity, ease: 'linear' }}
        sx={{ display: 'flex', width: 'max-content' }}
      >
        <Stack direction="row" spacing={5} sx={{ px: 2.5, flexShrink: 0 }}>
          {doubled.map((item, index) => (
            <Typography key={index} variant="body2" fontWeight={700} sx={{ color: 'primary.contrastText', whiteSpace: 'nowrap' }}>
              {item}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
