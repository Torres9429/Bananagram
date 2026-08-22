'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface ChartTitleProps {
  title: string;
  // Corta (1 línea idealmente), siempre visible debajo del título — resumen
  // de qué muestra el gráfico. Antes cada gráfico repetía su propio párrafo
  // largo acá (a veces 3-4 líneas) explicando además CÓMO leerlo — el
  // usuario pidió mantener una descripción, pero que sea breve.
  description: string;
  // Aclaración más completa (cómo interpretarlo, qué NO es) — va en el
  // tooltip del ícono junto al título, no estorbando el layout permanente.
  info: string;
  mb?: number;
}

export function ChartTitle({ title, description, info, mb = 2 }: ChartTitleProps) {
  return (
    <Stack mb={mb}>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        <Tooltip title={info} arrow placement="top" enterTouchDelay={0}>
          <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
        </Tooltip>
      </Stack>
      <Typography variant="caption" color="text.secondary">{description}</Typography>
    </Stack>
  );
}
