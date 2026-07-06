'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { selectUser, PrimaryButton } from '@repo/ui';
import { CreateCampaignDialog } from '../../../components/CreateCampaignDialog';
import {
  MOCK_CAMPAIGNS,
  CAMPAIGN_STATUS_LABEL,
  assignTeamToCampaign,
  getCurrentClientProfile,
  type MockCampaign,
} from '../../../lib/mock-data';

// Listado de campañas del Cliente en /profile — mismo contenido que
// brands-front/app/brands/[id]/campaigns, pero SIN BrandTabs.
export default function ProfileCampaignsPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const profile = getCurrentClientProfile(user?.email);
  const [campaigns, setCampaigns] = useState<MockCampaign[]>(MOCK_CAMPAIGNS.filter((c) => c.brandId === profile.id));
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tooltip title="Volver a mi perfil">
            <IconButton onClick={() => router.push('/profile')} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Campañas — {profile.name}</Typography>
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
                onClick={() => router.push(`/profile/campaigns/${c.id}`)}
                sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
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

      <CreateCampaignDialog
        open={createOpen}
        brandId={profile.id}
        brandCategory={profile.category}
        onClose={() => setCreateOpen(false)}
        onCreate={(campaign, team) => {
          assignTeamToCampaign(campaign.id, team);
          setCampaigns((prev) => [campaign, ...prev]);
        }}
      />
    </Box>
  );
}
