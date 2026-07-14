'use client';

import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StatusChip } from '@repo/ui/ui';
import { selectPost } from '../../store/analyticsFilters.slice';
import { selectSelectedPostDetail } from '../../store/analytics.selectors';
import { NETWORK_DISPLAY, NETWORK_METRIC_FIELDS } from '../../lib/analytics/network-config';

/**
 * Nivel 4 de drill-down (Publicación) — inline dentro del propio dashboard, sin
 * modal y sin cambiar de ruta. Se muestra cuando filters.postId está seteado
 * (por ejemplo, al hacer clic en una fila de TopContent).
 */
export function SelectedPostDetail() {
  const dispatch = useDispatch();
  const detail = useSelector(selectSelectedPostDetail);
  if (!detail) return null;

  const { fact, specific } = detail;
  const display = NETWORK_DISPLAY[fact.networkCode];
  const fieldLabels = NETWORK_METRIC_FIELDS[fact.networkCode];
  const specificEntries = fieldLabels.filter((field) => field.key in specific);

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
        <Button size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => dispatch(selectPost(null))} sx={{ color: 'secondary.main' }}>
          Volver
        </Button>
        <Chip size="small" label={display.label} sx={{ bgcolor: `${display.color}1A`, color: display.color, fontWeight: 700 }} />
        <StatusChip status={fact.status} />
      </Stack>

      <Typography variant="h6" fontWeight={700} mb={0.5}>{fact.postTitle}</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {fact.brandName} · {fact.campaignName ?? 'Sin campaña'} · {fact.publishedAt}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Typography variant="h6" fontWeight={700}>{fact.reach.toLocaleString()}</Typography>
          <Typography variant="caption" color="text.secondary">Reach</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="h6" fontWeight={700}>{fact.likes.toLocaleString()}</Typography>
          <Typography variant="caption" color="text.secondary">Likes</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="h6" fontWeight={700}>{fact.comments.toLocaleString()}</Typography>
          <Typography variant="caption" color="text.secondary">Comments</Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#2E7D32' }}>{fact.engagementRate}%</Typography>
          <Typography variant="caption" color="text.secondary">Engagement rate</Typography>
        </Grid>

        {specificEntries.map((field) => (
          <Grid item xs={6} sm={3} key={field.key}>
            <Typography variant="h6" fontWeight={700}>
              {specific[field.key as keyof typeof specific]}{field.unit ?? ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">{field.label}</Typography>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}
