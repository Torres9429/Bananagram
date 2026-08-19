'use client';

import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AnalyzePostPanel } from './AnalyzePostPanel';
import { ImprovePostPanel } from './ImprovePostPanel';

type AiTab = 'analyze' | 'improve';

interface Props {
  postId: string;
  canAnalyze: boolean;
  canImprove: boolean;
  onApplyImproved: (text: string) => void;
}

// Reemplaza los 2 diálogos modales (AnalyzePostDialog/ImprovePostDialog,
// retirados 2026-08-19) por una sección contraible en la misma pantalla,
// debajo de la card principal — un modal para "analizar mientras edito"
// tapaba el contenido que se estaba revisando, obligando a cerrarlo para
// comparar. canAnalyze siempre implica canImprove disponible o no (nunca al
// revés, según cómo se derivan en page.tsx: "Analizar" alcanza al Cliente
// revisando en 'aprobado', donde "Mejorar" no aplica) — si algún día eso
// cambiara, el tab inicial igual se resuelve solo (ver default de `tab`).
export function AiAssistantSection({ postId, canAnalyze, canImprove, onApplyImproved }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<AiTab>(canAnalyze ? 'analyze' : 'improve');

  if (!canAnalyze && !canImprove) return null;

  const showTabs = canAnalyze && canImprove;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      elevation={0}
      disableGutters
      sx={{
        border: '1px solid #E8E8E8',
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
          <Typography variant="subtitle1" fontWeight={700}>Asistente de IA</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
        {showTabs && (
          <Tabs
            value={tab}
            onChange={(_, v: AiTab) => setTab(v)}
            sx={{ mb: 2, minHeight: 36, borderBottom: '1px solid #E8E8E8', '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Analizar" value="analyze" />
            <Tab label="Mejorar" value="improve" />
          </Tabs>
        )}
        {canAnalyze && (tab === 'analyze' || !canImprove) && (
          <AnalyzePostPanel postId={postId} active={expanded && (tab === 'analyze' || !canImprove)} />
        )}
        {canImprove && tab === 'improve' && (
          <ImprovePostPanel postId={postId} active={expanded && tab === 'improve'} onApply={onApplyImproved} />
        )}
      </AccordionDetails>
    </Accordion>
  );
}
