'use client';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { getSocialNetwork, CAMPAIGN_STATUS_LABEL, getCampaignSocialAccounts } from '../../lib/mock-data';
import type { CampaignCardProps } from '../../interfaces/interface';

// Extraído de ClientSection (§1 modernización campañas CM/Diseñador) para
// reutilizar el mismo look de card entre Cliente y /my-campaigns sin duplicar
// el JSX del estado/redes/hover/"Ver detalle".
export function CampaignCard({ campaign, onClick, profileName }: CampaignCardProps) {
  const s = CAMPAIGN_STATUS_LABEL[campaign.status];
  const usedNetworks = Array.from(new Set(getCampaignSocialAccounts(campaign.id).map((a) => a.socialNetworkId)));

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%',
        cursor: 'pointer', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        display: 'flex', flexDirection: 'column',
        '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 10px rgba(224,168,0,0.15)' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography variant="body1" fontWeight={700}>{campaign.name}</Typography>
        <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
      </Stack>
      {profileName && (
        <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
          {profileName}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
        {campaign.startDate} – {campaign.endDate} · {campaign.postsCount} publicaciones
      </Typography>
      <Stack direction="row" gap={0.5} flexWrap="wrap" mb={2}>
        {usedNetworks.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Sin redes asignadas</Typography>
        ) : (
          usedNetworks.map((id) => {
            const network = getSocialNetwork(id);
            const netColor = network?.color ?? '#6B6B6B';
            return <Chip key={id} size="small" label={network?.label ?? id} sx={{ bgcolor: `${netColor}18`, color: netColor, fontWeight: 700, height: 20, fontSize: 11 }} />;
          })
        )}
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.5} mt="auto" sx={{ color: 'primary.contrastTextMuted' }}>
        <Typography variant="caption" fontWeight={700}>Ver detalle</Typography>
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </Stack>
    </Paper>
  );
}
