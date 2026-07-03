'use client';

import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import type { SvgIconComponent } from '@mui/icons-material';
import { selectNetwork } from '../../store/analyticsFilters.slice';
import { selectNetworkTabsSummary, selectSelectedNetwork } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import type { SocialNetworkCode } from '../../lib/analytics/types';

// TikTok y X (rebrand) no tienen ícono de marca dedicado en @mui/icons-material —
// se usan los más cercanos disponibles (MusicNote / Twitter) en vez de agregar una
// librería de íconos nueva.
const NETWORK_ICON: Record<SocialNetworkCode, SvgIconComponent> = {
  IG: InstagramIcon,
  TK: MusicNoteIcon,
  FB: FacebookIcon,
  X: TwitterIcon,
  LI: LinkedInIcon,
  YT: YouTubeIcon,
};

const ALL_NETWORKS: SocialNetworkCode[] = ['IG', 'TK', 'FB', 'X', 'LI', 'YT'];

/**
 * Selector visual de redes sociales — eje principal de navegación del dashboard
 * (Fase 3). No es un <Select>: cada red es una tarjeta con ícono, color oficial,
 * conteo de publicaciones e indicador de actividad. Cambiar de red dispara
 * selectNetwork(), que reemplaza por completo el contenido del dashboard.
 */
export function SocialNetworkTabs() {
  const dispatch = useDispatch();
  const selected = useSelector(selectSelectedNetwork);
  const summary = useSelector(selectNetworkTabsSummary);

  return (
    <Stack direction="row" gap={1.5} flexWrap="wrap" mb={3}>
      {ALL_NETWORKS.map((code) => {
        const display = NETWORK_DISPLAY[code];
        const Icon = NETWORK_ICON[code];
        const kpis = summary[code];
        const isSelected = selected === code;
        const hasActivity = !!kpis && kpis.postsCount > 0;

        return (
          <Paper
            key={code}
            elevation={0}
            onClick={() => dispatch(selectNetwork(isSelected ? null : code))}
            sx={{
              cursor: 'pointer',
              minWidth: 132,
              flex: '1 1 132px',
              p: 1.75,
              borderRadius: 3,
              border: '2px solid',
              borderColor: isSelected ? display.color : '#E8E8E8',
              bgcolor: isSelected ? `${display.color}14` : '#FFFFFF',
              opacity: selected && !isSelected ? 0.6 : 1,
              transition: 'opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': { borderColor: display.color },
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} mb={0.75}>
              <Box sx={{ color: display.color, display: 'flex' }}>
                <Icon fontSize="small" />
              </Box>
              <Typography variant="body2" fontWeight={700}>{display.label}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              {kpis ? `${kpis.postsCount} publicaciones` : 'Sin publicaciones'}
            </Typography>
            <Typography variant="caption" sx={{ color: hasActivity ? '#2E7D32' : 'text.secondary', fontWeight: 600 }} display="block">
              {kpis ? `${kpis.totalInteractions.toLocaleString()} interacciones` : '—'}
            </Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}
