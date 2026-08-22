'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataTable, type DataTableColumn, StatusChip, ProtectedAction, PrimaryButton } from '@repo/ui/ui';
import { NETWORK_LABELS, NETWORK_SHORT_LABELS, NETWORK_DISPLAY_COLORS } from '../../lib/mock-data';
import type { PostStatus } from '@repo/ui/types';
import { useListPostsQuery, type RealPostListItem } from '../../store/api/posts.api';
import { useListCampaignsQuery } from '../../store/api/campaigns.api';
import { NetworkAvatar } from '../../components/NetworkAvatar';
import { PostsTabs } from '../../components/PostsTabs';

// Reescrita a datos reales (Fase N) — antes leía MOCK_POSTS/MOCK_CAMPAIGNS.
// Los mapas NETWORK_LABELS/NETWORK_SHORT_LABELS/NETWORK_DISPLAY_COLORS se
// conservan: son presentación por código de red (igual que CAMPAIGN_STATUS_
// LABEL en brands-front), no datos de negocio inventados.
const FILTERS: { key: 'all' | PostStatus; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'rechazado', label: 'Rechazado' },
  { key: 'programado', label: 'Programado' },
  { key: 'publicando', label: 'Publicando' },
  { key: 'publicado', label: 'Publicado' },
  { key: 'parcial', label: 'Parcial' },
  { key: 'error', label: 'Error' },
  { key: 'cancelado', label: 'Cancelado' },
];

function postTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine || 'Sin contenido';
}

// useSearchParams requiere un límite de Suspense en el App Router.
export default function PostsListPage() {
  return (
    <Suspense fallback={null}>
      <PostsListContent />
    </Suspense>
  );
}

function PostsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<'all' | PostStatus>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(() => searchParams.get('campaign'));
  const [filtersOpen, setFiltersOpen] = useState(true);
  const hasActiveFilters = filter !== 'all' || !!campaignFilter;

  const { data: campaigns = [] } = useListCampaignsQuery();
  const { data: posts = [], isFetching: isLoadingPosts } = useListPostsQuery({
    status: filter === 'all' ? undefined : filter,
    campaignId: campaignFilter ?? undefined,
  });
  // Conteo de rechazados independiente de los filtros activos (mismo
  // comportamiento que antes tenía sobre el mock completo).
  const { data: rejectedPosts = [] } = useListPostsQuery({ status: 'rechazado' });

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const campaignName = campaignFilter ? campaignById.get(campaignFilter)?.name ?? campaignFilter : null;

  function handleClearCampaignFilter() {
    setCampaignFilter(null);
    router.replace('/posts');
  }

  function handleCampaignSelectChange(value: string) {
    setCampaignFilter(value || null);
    router.replace(value ? `/posts?campaign=${value}` : '/posts');
  }

  const columns: DataTableColumn<RealPostListItem>[] = [
    {
      key: 'network',
      header: '',
      width: 48,
      render: (post) => {
        const code = post.socialNetworks[0]?.socialNetwork.code;
        const colors = code ? NETWORK_DISPLAY_COLORS[code] : undefined;
        return (
          <NetworkAvatar
            network={code ? NETWORK_SHORT_LABELS[code] : '—'}
            networkBg={colors?.bg ?? '#EEEEEE'}
            networkColor={colors?.color ?? '#666666'}
          />
        );
      },
    },
    {
      key: 'info',
      header: 'Publicación',
      render: (post) => {
        const extraNetworks = post.socialNetworks.length - 1;
        const campaign = campaignById.get(post.campaignId);
        return (
          <>
            <Typography variant="body2" fontWeight={600}>
              {postTitle(post.content)}
            </Typography>
            <Stack direction="row" gap={1} mt={0.5} alignItems="center" flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">
                {campaign?.name ?? 'Sin campaña'}
                {extraNetworks > 0 ? ` · +${extraNetworks} red${extraNetworks > 1 ? 'es' : ''}` : ''}
              </Typography>
            </Stack>
          </>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (post) => <StatusChip status={post.status} />,
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (post) => (
        <Typography variant="caption" color="text.secondary">
          {new Date(post.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (post) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Ver publicación">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/posts/${post.id}`);
              }}
              sx={{ color: 'secondary.main', '&:hover': { bgcolor: 'rgba(192, 142, 6, 0.12)' } }}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh' }}>
      <PostsTabs />
      <Box sx={{ p: 3 }}>
      {campaignName && (
        <Stack direction="row" alignItems="center" gap={1} mb={2}>
          <Typography variant="body2" color="text.secondary">Mostrando publicaciones de:</Typography>
          <Chip
            label={campaignName}
            onDelete={handleClearCampaignFilter}
            size="small"
            sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }}
          />
        </Stack>
      )}
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <ProtectedAction module="publicaciones" action="crear">
          <PrimaryButton onClick={() => router.push('/posts/new')}>
            + Nueva publicación
          </PrimaryButton>
        </ProtectedAction>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          mb={filtersOpen ? 2 : 0}
          onClick={() => setFiltersOpen((v) => !v)}
          sx={{ cursor: 'pointer' }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <FilterAltOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
            <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
            {hasActiveFilters && !filtersOpen && (
              <Chip size="small" label="Activos" sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 600, height: 20, fontSize: 11 }} />
            )}
          </Stack>
          <IconButton
            size="small"
            aria-label={filtersOpen ? 'Contraer filtros' : 'Expandir filtros'}
            sx={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Collapse in={filtersOpen}>
          <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
            <Select
              size="small"
              displayEmpty
              value={campaignFilter ?? ''}
              onChange={(e) => handleCampaignSelectChange(e.target.value)}
              sx={{ minWidth: 180, bgcolor: '#fff', borderRadius: 1 }}
            >
              <MenuItem value="">Todas las campañas</MenuItem>
              {campaigns.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | PostStatus)}
              sx={{ minWidth: 180, bgcolor: '#fff', borderRadius: 1 }}
            >
              {FILTERS.map((f) => (
                <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
              ))}
            </Select>
          </Stack>
        </Collapse>
      </Paper>

      {rejectedPosts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rejectedPosts.length} publicaciones rechazadas requieren tu revisión.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={posts}
        getRowKey={(post) => post.id}
        onRowClick={(post) => router.push(`/posts/${post.id}`)}
        pagination
        initialPageSize={10}
        isLoading={isLoadingPosts}
        emptyMessage="No hay publicaciones para estos filtros."
      />
      </Box>
    </Box>
  );
}
