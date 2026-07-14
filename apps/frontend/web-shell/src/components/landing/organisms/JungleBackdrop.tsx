'use client';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';

interface VineLeaf {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
}

interface VineSpec {
  top: { x: number; y: number };
  path: string;
  leaves: VineLeaf[];
}

// Coordenadas tomadas 1:1 de la referencia (liana continua + hojas ancladas encima, viewBox local 180x900).
const LEFT_VINE: VineSpec = {
  top: { x: 90, y: 0 },
  path: 'M90 0 C60 80 120 160 80 240 C40 320 110 400 70 480 C30 560 100 640 60 720 C20 800 80 880 90 900',
  leaves: [
    { cx: 55, cy: 200, rx: 28, ry: 18, rotate: -30 },
    { cx: 95, cy: 340, rx: 32, ry: 20, rotate: 20 },
    { cx: 45, cy: 480, rx: 26, ry: 17, rotate: -15 },
    { cx: 85, cy: 620, rx: 30, ry: 19, rotate: 25 },
  ],
};

const RIGHT_VINE: VineSpec = {
  top: { x: 1350, y: 0 },
  path: 'M1350 0 C1380 80 1320 160 1360 240 C1400 320 1330 400 1370 480 C1410 560 1340 640 1380 720 C1420 800 1360 880 1350 900',
  leaves: [
    { cx: 1385, cy: 180, rx: 28, ry: 18, rotate: 30 },
    { cx: 1345, cy: 320, rx: 32, ry: 20, rotate: -20 },
    { cx: 1395, cy: 460, rx: 26, ry: 17, rotate: 15 },
    { cx: 1355, cy: 600, rx: 30, ry: 19, rotate: -25 },
  ],
};

function HangingVine({ spec, sway, tone, leafTone }: { spec: VineSpec; sway: number; tone: string; leafTone: string }) {
  // Ambient, decorativo y muy lento: se deja fuera de prefers-reduced-motion
  // a propósito (solo se reduce la amplitud/velocidad), porque un balanceo
  // suave de fondo no es el tipo de movimiento que esa preferencia busca
  // eliminar (parallax agresivo, autoplay, flashes) — y sin esto la liana
  // se queda completamente estática.
  const reduceMotion = useReducedMotion();
  const amplitude = reduceMotion ? sway / 2 : sway;
  const duration = reduceMotion ? 16 : 6;
  return (
    <motion.g
      animate={{ rotate: [-amplitude, amplitude, -amplitude], x: [-10, 10, -10] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: `${spec.top.x}px ${spec.top.y}px` }}
    >
      <path d={spec.path} stroke={tone} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.4} />
      {spec.leaves.map((leaf, index) => (
        <ellipse
          key={index}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={leafTone}
          opacity={index % 2 === 0 ? 0.3 : 0.25}
          transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
    </motion.g>
  );
}

/**
 * Fondo persistente tipo selva: lianas colgantes con hojas que se mecen
 * suavemente ("como con viento", igual que la referencia), línea de canopia
 * en el borde superior y una textura de puntos muy sutil — todo derivado del
 * theme (dorado/ámbar) en vez del verde/morado de las referencias.
 * `position: fixed` para que se mantenga detrás de toda la landing al hacer
 * scroll. Un panel de lectura translúcido corre por la columna central para
 * que el texto/los botones del contenido nunca pierdan contraste.
 */
export function JungleBackdrop() {
  const theme = useTheme();

  return (
    <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* preserveAspectRatio="none": el follaje está anclado a los bordes del
          viewBox a propósito — con "slice" el navegador recorta esos bordes
          en pantallas más anchas que 1440:900, así que estiramos exacto. */}
      <svg viewBox="0 0 1440 900" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="jungleSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.palette.background.default} />
            <stop offset="100%" stopColor={theme.palette.primary.light} />
          </linearGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#jungleSky)" />

        {/* línea de canopia, borde superior */}
        <path
          d="M0 60 Q180 20 360 45 Q540 10 720 40 Q900 15 1080 42 Q1260 12 1440 35 L1440 0 L0 0 Z"
          fill={theme.palette.primary.main}
          opacity={0.12}
        />
        <path
          d="M0 80 Q200 40 400 65 Q600 30 800 60 Q1000 35 1200 62 Q1320 45 1440 55 L1440 0 L0 0 Z"
          fill={theme.palette.primary.dark}
          opacity={0.08}
        />

        <HangingVine spec={LEFT_VINE} sway={4} tone={theme.palette.primary.dark} leafTone={theme.palette.primary.main} />
        <HangingVine spec={RIGHT_VINE} sway={4} tone={theme.palette.primary.dark} leafTone={theme.palette.primary.main} />
      </svg>

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: (t) => `radial-gradient(circle, ${t.palette.primary.main} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: (t) =>
            `linear-gradient(90deg, transparent 0%, ${t.palette.background.default} 24%, ${t.palette.background.default} 76%, transparent 100%)`,
          opacity: 0.88,
        }}
      />
    </Box>
  );
}
