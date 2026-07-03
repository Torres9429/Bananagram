'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { DataTable, type DataTableColumn, StatusChip, ProtectedAction } from '@repo/ui';
import { MOCK_POSTS, getPostNetworkInfo, type MockPost, type PostStatus } from '../../lib/mock-data';
import { NetworkAvatar } from '../../components/NetworkAvatar';
import { CampaignDot } from '../../components/CampaignDot';
import { PostsTabs } from '../../components/PostsTabs';

const FILTERS: { key: 'all' | PostStatus; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'rechazado', label: 'Rechazado' },
  { key: 'programado', label: 'Programado' },
  { key: 'publicado', label: 'Publicado' },
];

export default function PostsListPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | PostStatus>('all');

  const posts = filter === 'all' ? MOCK_POSTS : MOCK_POSTS.filter((p) => p.status === filter);
  const rejectedCount = MOCK_POSTS.filter((p) => p.status === 'rechazado').length;

  const columns: DataTableColumn<MockPost>[] = [
    {
      key: 'network',
      header: '',
      width: 48,
      render: (post) => {
        const { network, networkBg, networkColor } = getPostNetworkInfo(post);
        return <NetworkAvatar network={network} networkBg={networkBg} networkColor={networkColor} />;
      },
    },
    {
      key: 'info',
      header: 'Publicación',
      render: (post) => (
        <>
          <Typography variant="body2" fontWeight={600}>
            {post.title}
          </Typography>
          <Stack direction="row" gap={1} mt={0.5} alignItems="center" flexWrap="wrap">
            {post.campaign && <CampaignDot color={post.campaign.color} name={post.campaign.name} />}
            <Typography variant="caption" color="text.secondary">
              · {getPostNetworkInfo(post).brand}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {post.designer}
            </Typography>
          </Stack>
        </>
      ),
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
          <ProtectedAction module="post" action="publish">
            <Tooltip title="Publicar">
              <IconButton
                size="small"
                onClick={(e) => e.stopPropagation()}
                sx={{ color: '#2E7D32', '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.12)' } }}
              >
                <SendOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </ProtectedAction>
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Chip
                key={f.key}
                label={f.label}
                variant="outlined"
                onClick={() => setFilter(f.key)}
                sx={{
                  cursor: 'pointer',
                  bgcolor: active ? '#E0A800' : 'transparent',
                  color: active ? '#7A5C00' : '#1A1A1A',
                  borderColor: active ? '#D4AC40' : '#E8E8E8',
                  fontWeight: active ? 600 : 400,
                }}
              />
            );
          })}
        </Stack>
        <ProtectedAction module="post" action="create">
          <Button
            variant="contained"
            sx={{ bgcolor: '#E0A800', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
            onClick={() => router.push('/posts/new')}
          >
            + Nueva publicación
          </Button>
        </ProtectedAction>
      </Stack>

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
      />
      </Box>
    </Box>
  );
}
