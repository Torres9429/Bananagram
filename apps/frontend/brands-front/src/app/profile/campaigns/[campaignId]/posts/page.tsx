'use client';

import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DataTable, type DataTableColumn, StatusChip } from '@repo/ui';
import {
  MOCK_CAMPAIGNS,
  MOCK_POSTS_BY_CAMPAIGN,
  getSocialAccount,
  type MockCampaignPost,
} from '../../../../../lib/mock-data';

// Publicaciones de campaña en /profile — mismo contenido que
// brands-front/app/brands/[id]/campaigns/[campaignId]/posts, pero SIN
// CampaignTabs. Solo un botón simple de volver al detalle de la campaña.
export default function ProfileCampaignPostsPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === params.campaignId) ?? MOCK_CAMPAIGNS[0];
  const posts = MOCK_POSTS_BY_CAMPAIGN[campaign.id] ?? [];

  const columns: DataTableColumn<MockCampaignPost>[] = [
    { key: 'title', header: 'Publicación', render: (p) => <Typography variant="body2" fontWeight={600}>{p.title}</Typography> },
    {
      key: 'network',
      header: 'Red',
      render: (p) => (
        <Typography variant="caption" color="text.secondary">
          {getSocialAccount(p.brandProfileId)?.socialNetwork ?? '—'}
        </Typography>
      ),
    },
    { key: 'status', header: 'Estado', render: (p) => <StatusChip status={p.status} /> },
    { key: 'scheduledAt', header: 'Programado', align: 'right', render: (p) => <Typography variant="caption" color="text.secondary">{p.scheduledAt}</Typography> },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tooltip title="Volver a la campaña">
            <IconButton onClick={() => router.push(`/profile/campaigns/${campaign.id}`)} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Publicaciones — {campaign.name}</Typography>
        <DataTable columns={columns} rows={posts} getRowKey={(p) => p.id} />
      </Box>
    </Box>
  );
}
