'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { PrimaryButton } from '@repo/ui/ui';
import { BrandTabs } from '../../../../components/BrandTabs';
import { CreateCampaignDialog } from '../../../../components/CreateCampaignDialog';
import { useListCampaignsQuery } from '../../../../store/api/campaigns.api';
import { useGetBrandQuery } from '../../../../store/api/brands.api';
import { CAMPAIGN_STATUS_LABEL } from '../../../../lib/mock-data';

export default function CampaignsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: brand } = useGetBrandQuery(params.id);
  // El backend no filtra por brandId en la URL — se filtra client-side.
  const { data: allCampaigns = [] } = useListCampaignsQuery();
  const campaigns = allCampaigns.filter((c) => c.brandId === params.id);
  const [createOpen, setCreateOpen] = useState(false);

  if (!brand) return null;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Campañas — {brand.name}</Typography>
          <PrimaryButton onClick={() => setCreateOpen(true)}>
            + Nueva campaña
          </PrimaryButton>
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
                sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
              >
                <Box>
                  <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.startDate ?? 'Sin definir'} – {c.endDate ?? 'Sin definir'}</Typography>
                </Box>
                <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <CreateCampaignDialog open={createOpen} brandId={brand.id} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
