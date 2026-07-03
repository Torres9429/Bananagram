'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { CampaignTabs } from '../../../../../components/CampaignTabs';
import {
  MOCK_PROFILES,
  MOCK_CAMPAIGNS,
  MOCK_POSTS_BY_CAMPAIGN,
  CAMPAIGN_STATUS_LABEL,
} from '../../../../../lib/mock-data';

export default function CampaignDetailPage() {
  const params = useParams<{ id: string; campaignId: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === params.campaignId) ?? MOCK_CAMPAIGNS[0];
  const posts = MOCK_POSTS_BY_CAMPAIGN[campaign.id] ?? [];
  const published = posts.filter((p) => p.status === 'publicado').length;
  const progress = posts.length ? Math.round((published / posts.length) * 100) : 0;
  const statusStyle = CAMPAIGN_STATUS_LABEL[campaign.status];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <CampaignTabs brandId={brand.id} campaignId={campaign.id} backHref="/my-campaigns" />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{campaign.name}</Typography>
            <Typography variant="body2" color="text.secondary">{brand.name} · {campaign.startDate} – {campaign.endDate}</Typography>
          </Box>
          <Chip label={statusStyle.label} sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }} />
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Publicaciones</Typography>
              <Typography variant="h4" fontWeight={700} mb={1}>{campaign.postsCount}</Typography>
              <Typography variant="caption" color="text.secondary">{published} publicadas de {posts.length} registradas</Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: '#F5F5F5', '& .MuiLinearProgress-bar': { backgroundColor: '#E0A800' } }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
