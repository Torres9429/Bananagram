'use client';
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

// classification es un string abierto (no enum) en modelo.txt — ver
// docs/frontend-db-alignment.md §9.11. COLORS cubre los 3 valores que emite
// hoy el cálculo del score; cualquier otro valor cae en DEFAULT_COLOR.
interface Props { score: number; classification: string; }

const COLORS: Record<string, string> = { bajo: '#C62828', medio: '#E65100', alto: '#2E7D32' };
const DEFAULT_COLOR = '#616161';

export function ScoreGauge({ score, classification }: Props) {
  // recharts genera un id de <clipPath> distinto en cada render (servidor vs
  // cliente), lo que provoca un hydration mismatch. Se renderiza solo en
  // cliente para que el HTML del servidor nunca incluya ese SVG.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const color = COLORS[classification] ?? DEFAULT_COLOR;
  const data = [{ name: 'score', value: score }];

  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ position: 'relative', width: 140, height: 140, mx: 'auto' }}>
        {mounted && (
          <RadialBarChart
            width={140}
            height={140}
            cx="50%"
            cy="50%"
            innerRadius="75%"
            outerRadius="100%"
            barSize={10}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#F5F5F5' }} dataKey="value" cornerRadius={6} fill={color} />
          </RadialBarChart>
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h4" sx={{ color, fontWeight: 700 }}>
            {Math.round(score)}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">Score Digital</Typography>
    </Box>
  );
}
