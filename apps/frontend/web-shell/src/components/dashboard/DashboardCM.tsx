'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { StatusChip, WidgetCard, PrimaryButton } from '@repo/ui';
import { MOCK_DASHBOARD, MOCK_POSTS_BY_STATUS, MOCK_POSTS_BY_NETWORK, getSocialAccount } from '../../lib/mock-dashboard';

const POSTS_FRONT_URL = 'http://localhost:3014';

export function DashboardCM() {
  const { kpis, campaigns, recentPosts } = MOCK_DASHBOARD;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Hola, {MOCK_DASHBOARD.cmName} 👋</Typography>
          <Typography variant="body2" color="text.secondary">Resumen de tu actividad como Community Manager</Typography>
        </Box>
        <PrimaryButton
          endIcon={<ArrowForwardIcon />}
          onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts`; }}
        >
          Ir a Publicaciones
        </PrimaryButton>
      </Stack>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WidgetCard icon={<RateReviewOutlinedIcon />} label="Pendientes de revisión" value={kpis.pendingReview} iconBg={kpis.pendingReview > 0 ? '#FFF3E0' : '#F5F5F5'} iconColor={kpis.pendingReview > 0 ? '#E65100' : '#9E9E9E'} />
        <WidgetCard icon={<CampaignOutlinedIcon />} label="Campañas activas" value={kpis.activeCampaigns} />
        <WidgetCard icon={<TrendingUpOutlinedIcon />} label="Score promedio" value={kpis.avgScore} />
        <WidgetCard icon={<ScheduleOutlinedIcon />} label="Próxima publicación" value={kpis.nextScheduled} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-5">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Campañas</Typography>
            <Stack gap={2.5}>
              {campaigns.map((c) => (
                <Box key={c.id}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.progress}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={c.progress} sx={{ height: 8, borderRadius: 4, bgcolor: '#F5F5F5', '& .MuiLinearProgress-bar': { backgroundColor: c.color } }} />
                </Box>
              ))}
            </Stack>
          </Paper>
        </div>

        <div className="lg:col-span-7">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Publicaciones recientes</Typography>
              <Typography variant="body2" onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts`; }} sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>Ver todas →</Typography>
            </Stack>
            <Stack gap={1.5}>
              {recentPosts.map((post) => (
                <Stack key={post.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5, border: '1px solid #F0F0F0', borderRadius: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{post.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{getSocialAccount(post.brandProfileId)?.socialNetwork ?? '—'}</Typography>
                  </Box>
                  <StatusChip status={post.status} />
                </Stack>
              ))}
            </Stack>
          </Paper>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Publicaciones por estado</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MOCK_POSTS_BY_STATUS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="count" fill="#E0A800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>Distribución por red social</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={MOCK_POSTS_BY_NETWORK} dataKey="count" nameKey="network" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {MOCK_POSTS_BY_NETWORK.map((entry) => (<Cell key={entry.network} fill={entry.color} />))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </div>
    </Box>
  );
}
