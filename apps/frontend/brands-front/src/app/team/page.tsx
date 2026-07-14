'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import { getInitials } from '@repo/ui/utils';
import { getTeamAggregate } from '../../lib/mock-data';

export default function TeamPage() {
  const team = getTeamAggregate();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={1}>Equipo</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Personas con las que colaboras en tus campañas activas.
      </Typography>
      <Stack gap={1.5}>
        {team.map((member) => (
          <Stack
            key={member.id}
            direction="row"
            gap={2}
            alignItems="flex-start"
            sx={{ p: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: 3 }}
          >
            <Avatar sx={{ bgcolor: member.avatarBg, color: member.avatarColor, fontWeight: 600 }}>
              {getInitials(member.name)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
                <Chip size="small" label={member.role} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} />
              </Stack>
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                {member.campaigns.map((c) => (
                  <Chip key={c.id} size="small" variant="outlined" label={`${c.name} · ${c.profileName}`} sx={{ fontSize: 11 }} />
                ))}
              </Stack>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
