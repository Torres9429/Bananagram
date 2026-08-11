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
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataTable, type DataTableColumn, StatusChip, ProtectedAction, PrimaryButton } from '@repo/ui/ui';
import { MOCK_POSTS, MOCK_CAMPAIGNS, getPostNetworkInfo } from '../../lib/mock-data';
import type { MockPost, PostStatus } from '../../interfaces/interface';
import { NetworkAvatar } from '../../components/NetworkAvatar';
import { CampaignDot } from '../../components/CampaignDot';
import { PostsTabs } from '../../components/PostsTabs';

// Cubre los 10 valores de PostStatus (antes solo 5) — ver
// docs/frontend-db-alignment.md §1.3. 'publicando' es transitorio pero se
// incluye igual: si un post mock queda en ese estado, debe poder filtrarse
// (y StatusChip ya soporta los 10, no hay riesgo de fallback roto).
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

// useSearchParams requiere un límite de Suspense en el App Router (si no,
// Next.js no puede prerenderizar la ruta en el build) — el propio hook solo
// vive en PostsListContent, este wrapper es el único cambio necesario.
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
  // Sembrado desde ?campaign=<id> (llegada desde "Ver publicaciones" en el
  // detalle de campaña de brands-front) — mismo patrón ya usado por
  // auth-front/ActivateForm para leer un param una sola vez al montar.
  // Después de eso vive solo en estado local; limpiar el filtro no navega.
  const [campaignFilter, setCampaignFilter] = useState<string | null>(() => searchParams.get('campaign'));
  const [filtersOpen, setFiltersOpen] = useState(true);
  const hasActiveFilters = filter !== 'all' || !!campaignFilter;

  const campaignName = campaignFilter
    ? MOCK_POSTS.find((p) => p.campaign?.id === campaignFilter)?.campaign?.name ?? campaignFilter
    : null;

  // Puede llegar un campaignId que no esté en el catálogo local de campañas
  // de posts-front (cada microfrontend tiene su propio mock) — se agrega como
  // opción extra para que el select nunca quede en blanco.
  const campaignOptions =
    campaignFilter && !MOCK_CAMPAIGNS.some((c) => c.id === campaignFilter)
      ? [
          ...MOCK_CAMPAIGNS,
          {
            id: campaignFilter,
            name: campaignName ?? campaignFilter,
            brandId: '',
            status: 'active' as const,
            cmId: '',
            createdBy: '',
            socialAccountIds: [],
          },
        ]
      : MOCK_CAMPAIGNS;

  const posts = MOCK_POSTS
    .filter((p) => filter === 'all' || p.status === filter)
    .filter((p) => !campaignFilter || p.campaign?.id === campaignFilter);
  const rejectedCount = MOCK_POSTS.filter((p) => p.status === 'rechazado').length;

  function handleClearCampaignFilter() {
    setCampaignFilter(null);
    router.replace('/posts');
  }

  function handleCampaignSelectChange(value: string) {
    setCampaignFilter(value || null);
    router.replace(value ? `/posts?campaign=${value}` : '/posts');
  }

  const columns: DataTableColumn<MockPost>[] = [
    {
      key: 'network',
      header: '',
      width: 48,
      render: (post) => {
        // Fila de lista: solo representa la primera red del post (el
        // detalle completo por red vive únicamente en /posts/[id], ver
        // decisión §3 en docs/frontend-db-alignment.md — no se agregan
        // mini-franjas de estado por red aquí).
        const { networkShort, networkBg, networkColor } = getPostNetworkInfo(post.socialAccounts[0]?.socialAccountId);
        return <NetworkAvatar network={networkShort} networkBg={networkBg} networkColor={networkColor} />;
      },
    },
    {
      key: 'info',
      header: 'Publicación',
      render: (post) => {
        const { brand } = getPostNetworkInfo(post.socialAccounts[0]?.socialAccountId);
        const extraNetworks = post.socialAccounts.length - 1;
        return (
          <>
            <Typography variant="body2" fontWeight={600}>
              {post.title}
            </Typography>
            <Stack direction="row" gap={1} mt={0.5} alignItems="center" flexWrap="wrap">
              {post.campaign && <CampaignDot color={post.campaign.color} name={post.campaign.name} />}
              <Typography variant="caption" color="text.secondary">
                · {brand}
                {extraNetworks > 0 ? ` +${extraNetworks}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                · {post.designer}
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
          {post.createdAt}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (post) => (
        <Stack direction="row" justifyContent="flex-end">
          {(post.status === 'aprobado' || post.status === 'programado') && (
            <ProtectedAction module="publicaciones" action="editar">
              <Tooltip title="Publicar">
                <IconButton
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ color: 'secondary.main', '&:hover': { bgcolor: 'rgba(192, 142, 6, 0.12)' } }}
                >
                  <SendOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ProtectedAction>
          )}
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
      {/* Contexto — solo cuando llega con una campaña preseleccionada (§3):
          no es breadcrumb ni tab, solo un chip removible sobre la tabla. */}
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

      {/* Filtros — contraíble, mismo patrón que profile/calendar/page.tsx. */}
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
            {/* Select de Campaña, siempre visible — no solo cuando llega
                preseleccionada desde el detalle de campaña. */}
            <Select
              size="small"
              displayEmpty
              value={campaignFilter ?? ''}
              onChange={(e) => handleCampaignSelectChange(e.target.value)}
              sx={{ minWidth: 180, bgcolor: '#fff', borderRadius: 1 }}
            >
              <MenuItem value="">Todas las campañas</MenuItem>
              {campaignOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
            {/* Select de Estado — antes una fila de 11 chips (Todos + los 10
                PostStatus), reemplazado por un dropdown por consistencia visual
                con el select de Campaña de al lado. */}
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

      {rejectedCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {rejectedCount} publicaciones rechazadas requieren tu revisión.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={posts}
        getRowKey={(post) => post.id}
        onRowClick={(post) => router.push(`/posts/${post.id}`)}
        pagination
        initialPageSize={10}
        emptyMessage="No hay publicaciones para estos filtros."
      />
      </Box>
    </Box>
  );
}
