'use client';

import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { ScoreGauge } from '@repo/ui/ui';
import { BrandTabs } from '../../../components/BrandTabs';
import { MOCK_PROFILES, MOCK_CAMPAIGNS, CAMPAIGN_STATUS_LABEL } from '../../../lib/mock-data';

export default function BrandOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];
  const campaigns = MOCK_CAMPAIGNS.filter((c) => c.brandId === brand.id);

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" gap={2} alignItems="center" mb={3}>
          <Avatar sx={{ bgcolor: brand.color, width: 56, height: 56, fontWeight: 700, fontSize: 18 }}>
            {brand.name.slice(0, 2).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>{brand.name}</Typography>
            <Typography variant="body2" color="text.secondary">{brand.categoryId}</Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Score Digital</Typography>
              <ScoreGauge score={brand.score.score} classification={brand.score.classification} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>Campañas</Typography>
              </Stack>
              <Stack gap={1.5}>
                {campaigns.map((c) => {
                  const s = CAMPAIGN_STATUS_LABEL[c.status];
                  return (
                    <Stack
                      key={c.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      onClick={() => router.push(`/brands/${brand.id}/campaigns/${c.id}`)}
                      sx={{ p: 1.5, border: '1px solid #F0F0F0', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.startDate} – {c.endDate} · {c.postsCount} publicaciones</Typography>
                      </Box>
                      <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
