'use client';

// LEGACY/DEPRECATED (dominio v3): step de OnboardingWizard, que ya no forma
// parte de ningún flujo alcanzable (ver OnboardingWizard.tsx). Se conserva
// sin borrar por si se reutiliza más adelante.
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { AVAILABLE_SOCIAL_NETWORKS, type MockAvailableCM } from '../../../lib/mock-data';
import type { ProfileDraft } from './StepProfile';
import type { CampaignDraft } from './StepCampaign';
import type { SocialNetworkCode } from '../../../lib/mock-data';

interface Props {
  profile: ProfileDraft;
  networks: SocialNetworkCode[];
  campaign: CampaignDraft;
  cm: MockAvailableCM | null;
}

function SummarySection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Stack direction="row" gap={1} alignItems="center" mb={1}>
        <Box sx={{ color: '#D4AC40' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

export function StepConfirmation({ profile, networks, campaign, cm }: Props) {
  return (
    <Stack gap={0.5}>
      <Stack direction="row" gap={1.5} alignItems="center" mb={2}>
        <CheckCircleOutlineIcon sx={{ fontSize: 32, color: '#2E7D32' }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>¡Todo listo!</Typography>
          <Typography variant="body2" color="text.secondary">
            Revisa el resumen antes de finalizar la configuración.
          </Typography>
        </Box>
      </Stack>

      <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 2.5 }}>
        <Stack gap={2.5} divider={<Divider />}>
          <SummarySection icon={<StorefrontOutlinedIcon fontSize="small" />} title="Perfil">
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" fontWeight={600}>{profile.name}</Typography>
              <Chip
                label={profile.type === 'brand' ? 'Marca comercial' : 'Perfil personal'}
                size="small"
                sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }}
              />
              <Chip label={profile.category} size="small" variant="outlined" />
            </Stack>
            <Stack direction="row" gap={0.75} mt={1} flexWrap="wrap">
              {networks.map((code) => {
                const net = AVAILABLE_SOCIAL_NETWORKS.find((n) => n.code === code);
                return net ? (
                  <Chip
                    key={code}
                    label={net.label}
                    size="small"
                    sx={{ bgcolor: `${net.color}15`, color: net.color, fontWeight: 600, border: `1px solid ${net.color}40` }}
                  />
                ) : null;
              })}
            </Stack>
          </SummarySection>

          <SummarySection icon={<CampaignOutlinedIcon fontSize="small" />} title="Primera campaña">
            <Typography variant="body2" fontWeight={600}>{campaign.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {campaign.startDate} → {campaign.endDate}
            </Typography>
            {campaign.objective && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {campaign.objective}
              </Typography>
            )}
          </SummarySection>

          <SummarySection icon={<GroupOutlinedIcon fontSize="small" />} title="Community Manager">
            {cm ? (
              <Stack direction="row" gap={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: cm.avatarBg, color: cm.avatarColor, width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                  {cm.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{cm.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Asignado directamente — comenzará coordinando tu campaña de inmediato.
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No seleccionado</Typography>
            )}
          </SummarySection>
        </Stack>
      </Paper>
    </Stack>
  );
}
