'use client';

import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { BrandTabs } from '../../../../components/BrandTabs';
import { MOCK_BRANDS, MOCK_CAMPAIGNS, CAMPAIGN_STATUS_LABEL } from '../../../../lib/mock-data';

export default function CampaignsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const brand = MOCK_BRANDS.find((b) => b.id === params.id) ?? MOCK_BRANDS[0];
  const campaigns = MOCK_CAMPAIGNS.filter((c) => c.brandId === brand.id);

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Campañas — {brand.name}</Typography>
          <Button variant="contained" sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}>
            + Nueva campaña
          </Button>
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
                sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: '#FDC726' } }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.startDate} – {c.endDate} · {c.postsCount} publicaciones</Typography>
                </Box>
                <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
