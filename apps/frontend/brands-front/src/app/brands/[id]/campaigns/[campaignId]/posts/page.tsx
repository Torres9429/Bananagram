'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { DataTable, type DataTableColumn, StatusChip } from '@repo/ui/ui';
import { CampaignTabs } from '../../../../../../components/CampaignTabs';
import {
  MOCK_PROFILES,
  MOCK_CAMPAIGNS,
  MOCK_POSTS_BY_CAMPAIGN,
  getSocialAccount,
} from '../../../../../../lib/mock-data';
import type { MockCampaignPost } from '../../../../../../interfaces/interface';

export default function CampaignPostsPage() {
  const params = useParams<{ id: string; campaignId: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];
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
      <CampaignTabs brandId={brand.id} campaignId={campaign.id} backHref="/my-campaigns" />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Publicaciones — {campaign.name}</Typography>
        <DataTable columns={columns} rows={posts} getRowKey={(p) => p.id} pagination initialPageSize={10} emptyMessage="No hay publicaciones registradas para esta campaña." />
      </Box>
    </Box>
  );
}
