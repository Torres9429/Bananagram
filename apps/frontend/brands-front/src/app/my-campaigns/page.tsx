'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { EmptyState } from '@repo/ui';
import { getMyCampaigns, CAMPAIGN_STATUS_LABEL } from '../../lib/mock-data';

export default function MyCampaignsPage() {
  const router = useRouter();
  const campaigns = getMyCampaigns();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Mis campañas</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Campañas en las que participas, de todas las marcas asignadas.
      </Typography>
      {campaigns.length === 0 && (
        <EmptyState
          title="Sin campañas asignadas"
          description="Aún no participas en ninguna campaña. El CM o el Cliente te asignarán cuando haya trabajo disponible."
        />
      )}
      <Stack gap={1.5}>
        {campaigns.map((c) => {
          const s = CAMPAIGN_STATUS_LABEL[c.status];
          return (
            <Stack
              key={c.id}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              onClick={() => router.push(`/brands/${c.brandId}/campaigns/${c.id}`)}
              sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: '#FDC726' } }}
            >
              <Stack direction="row" gap={1.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.brandColor }} />
                <Box>
                  <Typography variant="body1" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.brandName} · {c.startDate} – {c.endDate} · {c.postsCount} publicaciones
                  </Typography>
                </Box>
              </Stack>
              <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
