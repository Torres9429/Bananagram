'use client';

import { useDispatch, useSelector } from 'react-redux';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { DataTable, type DataTableColumn } from '@repo/ui/ui';
import { selectPost } from '../../store/analyticsFilters.slice';
import { selectNetworkDashboard, selectSelectedNetwork, selectTopPosts } from '../../store/analytics.selectors';
import type { SocialMetricFact } from '../../lib/analytics/types';

const columns: DataTableColumn<SocialMetricFact>[] = [
  { key: 'title', header: 'Publicación', render: (p) => <Typography variant="body2" fontWeight={600}>{p.postTitle}</Typography> },
  { key: 'campaign', header: 'Campaña', render: (p) => <Typography variant="body2" color="text.secondary">{p.campaignName ?? '—'}</Typography> },
  { key: 'likes', header: 'Likes', align: 'right', render: (p) => <Typography variant="body2">{p.likes.toLocaleString()}</Typography> },
  {
    key: 'engagement',
    header: 'Engagement',
    align: 'right',
    render: (p) => <Typography variant="body2" fontWeight={700} sx={{ color: '#2E7D32' }}>{p.engagement}%</Typography>,
  },
];

/**
 * Mejores publicaciones — en una pestaña de red reutiliza rankPosts (Fase 1) vía
 * buildNetworkDashboard (el título "Top Reels", "Trending Videos"... viene del
 * engine, no está hardcodeado aquí); en "General" reutiliza selectTopPosts, ya
 * existente, agregando de todas las redes. Clic en una fila = drill a esa publicación.
 */
export function TopContent() {
  const dispatch = useDispatch();
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const dashboard = useSelector(selectNetworkDashboard);
  const generalTopPosts = useSelector(selectTopPosts);

  const topContent = selectedNetwork ? (dashboard?.topContent ?? []) : generalTopPosts;
  const topContentLabel = selectedNetwork ? dashboard?.topContentLabel : 'Top publicaciones';
  const activeProfiles = selectedNetwork ? dashboard?.audience.activeProfiles ?? 0 : 0;
  if (topContent.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3, mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{topContentLabel}</Typography>
      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        Clic en una fila para ver el detalle de esa publicación.
      </Typography>
      <DataTable
        columns={columns}
        rows={topContent}
        getRowKey={(p) => p.id}
        onRowClick={(p) => dispatch(selectPost(p.postId))}
        pagination
        initialPageSize={10}
      />
      {activeProfiles > 0 && (
        <Chip
          size="small"
          sx={{ mt: 2, bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 600 }}
          label={`${activeProfiles} perfil${activeProfiles > 1 ? 'es' : ''} activo${activeProfiles > 1 ? 's' : ''}`}
        />
      )}
    </Paper>
  );
}
