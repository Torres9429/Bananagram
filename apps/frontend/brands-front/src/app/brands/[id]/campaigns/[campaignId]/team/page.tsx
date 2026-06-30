'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { CampaignTabs } from '../../../../../../components/CampaignTabs';
import { MOCK_BRANDS, MOCK_CAMPAIGNS, MOCK_TEAM_BY_CAMPAIGN } from '../../../../../../lib/mock-data';

export default function CampaignTeamPage() {
  const params = useParams<{ id: string; campaignId: string }>();
  const brand = MOCK_BRANDS.find((b) => b.id === params.id) ?? MOCK_BRANDS[0];
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === params.campaignId) ?? MOCK_CAMPAIGNS[0];
  const team = MOCK_TEAM_BY_CAMPAIGN[campaign.id] ?? [];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <CampaignTabs brandId={brand.id} campaignId={campaign.id} backHref="/my-campaigns" />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Equipo — {campaign.name}</Typography>
        <Stack gap={1.5}>
          {team.map((member) => (
            <Stack
              key={member.id}
              direction="row"
              gap={2}
              alignItems="center"
              sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3 }}
            >
              <Avatar sx={{ bgcolor: member.avatarBg, color: member.avatarColor, fontWeight: 600 }}>
                {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
              </Box>
              <Chip size="small" label={member.role} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} />
            </Stack>
          ))}
          {team.length === 0 && (
            <Typography variant="body2" color="text.secondary">Sin integrantes asignados a esta campaña.</Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
