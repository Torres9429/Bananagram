'use client';

import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { EmptyState } from '@repo/ui';
import { selectCampaign, selectPost } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters, selectTimeline } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';

/**
 * Línea de tiempo de publicaciones e inicios de campaña (buildTimeline, Fase 4).
 * Clic en un elemento sincroniza el drill-down — reutiliza selectPost/selectCampaign
 * ya existentes, sin estado nuevo. No incluye "cambios de score": no existe un
 * histórico real de score en los mocks y se decidió no inventarlo.
 */
export function ActivityTimeline() {
  const dispatch = useDispatch();
  const events = useSelector(selectTimeline);
  const filters = useSelector(selectAnalyticsFilters);

  if (events.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
        <EmptyState title="Sin actividad para mostrar" description="Ajusta los filtros activos." />
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Línea de tiempo</Typography>
      <Stack sx={{ position: 'relative', pl: 3, borderLeft: '2px solid #E8E8E8' }} gap={2}>
        {events.map((event) => {
          const isSelected = event.type === 'post' ? filters.postId === event.postId : filters.campaignId === event.campaignId;
          const color = event.networkCode ? NETWORK_DISPLAY[event.networkCode].color : '#7A5C00';
          return (
            <Box
              key={event.id}
              onClick={() => (event.type === 'post' ? dispatch(selectPost(event.postId)) : dispatch(selectCampaign(event.campaignId)))}
              sx={{
                position: 'relative',
                cursor: 'pointer',
                p: 1.25,
                borderRadius: 2,
                bgcolor: isSelected ? '#FFF8E1' : 'transparent',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: '#FAFAFA' },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: -29,
                  top: 14,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: color,
                },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                {event.type === 'campaign' ? <CampaignOutlinedIcon fontSize="small" sx={{ color }} /> : <ArticleOutlinedIcon fontSize="small" sx={{ color }} />}
                <Typography variant="body2" fontWeight={600}>{event.label}</Typography>
                {event.networkCode && <Chip size="small" label={event.networkCode} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">{event.date}</Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
