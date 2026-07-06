'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { ScoreGauge, StatusChip, WidgetCard, PrimaryButton } from '@repo/ui';
import { MOCK_CLIENTE_DASHBOARD, getSocialAccount } from '../../lib/mock-dashboard';

const POSTS_FRONT_URL = 'http://localhost:3014';
const BRANDS_FRONT_URL = 'http://localhost:3013';

export function DashboardCliente() {
  const { brandName, pendingApprovals, activeCampaigns, score, scoreClassification, metrics24h, team, postsToApprove } = MOCK_CLIENTE_DASHBOARD;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{brandName}</Typography>
          <Typography variant="body2" color="text.secondary">Panel de tu perfil · {activeCampaigns} campañas activas</Typography>
        </Box>
        <PrimaryButton onClick={() => { window.location.href = `${BRANDS_FRONT_URL}/profile`; }}>
          Ver mi perfil →
        </PrimaryButton>
      </Stack>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WidgetCard icon={<RateReviewOutlinedIcon />} label="Pendientes de aprobación" value={pendingApprovals} iconBg={pendingApprovals > 0 ? '#FFF3E0' : '#F5F5F5'} iconColor={pendingApprovals > 0 ? '#E65100' : '#9E9E9E'} />
        <WidgetCard icon={<CampaignOutlinedIcon />} label="Campañas activas" value={activeCampaigns} />
        <WidgetCard icon={<InsightsOutlinedIcon />} label="Alcance últimas 24h" value={metrics24h.reach.toLocaleString('es-MX')} />
        <WidgetCard icon={<TrendingUpOutlinedIcon />} label="Engagement 24h" value={`${metrics24h.engagement}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Score Digital</Typography>
            <ScoreGauge score={score} classification={scoreClassification} />
          </Paper>
        </div>

        <div className="lg:col-span-8">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Esperan tu aprobación</Typography>
              <Typography variant="body2" onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/approvals`; }}
                sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>Ver todas →</Typography>
            </Stack>
            {postsToApprove.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No hay publicaciones pendientes. 🎉</Typography>
            ) : (
              <Stack gap={1.5}>
                {postsToApprove.map((post) => (
                  <Stack key={post.id} direction="row" justifyContent="space-between" alignItems="center"
                    onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/${post.id}`; }}
                    sx={{ p: 1.5, border: '1px solid #F0F0F0', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{post.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.campaign} · {getSocialAccount(post.brandProfileId)?.socialNetwork ?? '—'}
                      </Typography>
                    </Box>
                    <StatusChip status={post.status} />
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </div>

        <div className="lg:col-span-12">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Tu equipo de campaña</Typography>
              <Chip label={team.length > 0 ? 'Equipo activo' : 'Sin equipo'} size="small"
                sx={{ bgcolor: team.length > 0 ? '#E8F5E9' : '#FFF3E0', color: team.length > 0 ? '#2E7D32' : '#E65100', fontWeight: 600 }} />
            </Stack>
            <Stack direction="row" gap={2} flexWrap="wrap">
              {team.map((member) => (
                <Stack key={member.id} direction="row" gap={1.5} alignItems="center" sx={{ minWidth: 200 }}>
                  <Avatar sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                    {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{member.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{member.role}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </div>
      </div>
    </Box>
  );
}
