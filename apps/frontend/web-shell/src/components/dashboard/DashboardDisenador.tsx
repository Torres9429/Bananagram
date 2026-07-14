'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PublishedWithChangesOutlinedIcon from '@mui/icons-material/PublishedWithChangesOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { StatusChip, WidgetCard, EmptyState, PrimaryButton } from '@repo/ui/ui';
import { MOCK_DISENADOR_DASHBOARD, getSocialAccount } from '../../lib/mock-dashboard';

const POSTS_FRONT_URL = 'http://localhost:3014';
const BRANDS_FRONT_URL = 'http://localhost:3013';

export function DashboardDisenador() {
  const { designerName, myPosts, assignedCampaigns, recentPosts } = MOCK_DISENADOR_DASHBOARD;
  const hasCampaigns = assignedCampaigns.length > 0;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Hola, {designerName} 👋</Typography>
          <Typography variant="body2" color="text.secondary">
            {hasCampaigns ? `Participas en ${assignedCampaigns.length} campaña${assignedCampaigns.length > 1 ? 's' : ''} activa${assignedCampaigns.length > 1 ? 's' : ''}` : 'Aún no tienes campañas asignadas'}
          </Typography>
        </Box>
        <PrimaryButton startIcon={<AddCircleOutlineIcon />}
          onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/new`; }}>
          Nueva publicación
        </PrimaryButton>
      </Stack>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <WidgetCard icon={<EditNoteOutlinedIcon />} label="Mis borradores" value={myPosts.drafts} />
        <WidgetCard icon={<CancelOutlinedIcon />} label="Rechazadas" value={myPosts.rejected} iconBg={myPosts.rejected > 0 ? '#FFEBEE' : '#F5F5F5'} iconColor={myPosts.rejected > 0 ? '#C62828' : '#9E9E9E'} />
        <WidgetCard icon={<PublishedWithChangesOutlinedIcon />} label="Publicadas" value={myPosts.published} iconBg="#E8F5E9" iconColor="#2E7D32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Mis campañas</Typography>
              <Typography variant="body2" onClick={() => { window.location.href = `${BRANDS_FRONT_URL}/my-campaigns`; }}
                sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>Ver todas →</Typography>
            </Stack>
            {hasCampaigns ? (
              <Stack gap={1.5}>
                {assignedCampaigns.map((c) => (
                  <Stack key={c.id} direction="row" gap={1.5} alignItems="center"
                    sx={{ p: 1.5, border: '1px solid #F0F0F0', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}>
                    <Avatar sx={{ bgcolor: c.color, width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>{c.name[0]}</Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.brandName}</Typography>
                    </Box>
                    <Chip size="small" label="Activa" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, ml: 'auto' }} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <EmptyState title="Sin campañas" description="El CM te asignará cuando haya trabajo disponible." />
            )}
          </Paper>
        </div>

        <div className="lg:col-span-7">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Mis publicaciones recientes</Typography>
              <Typography variant="body2" onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts`; }}
                sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>Ver todas →</Typography>
            </Stack>
            {recentPosts.length === 0 ? (
              <EmptyState title="Aún no tienes publicaciones" description="Crea tu primer borrador." />
            ) : (
              <Stack gap={1.5}>
                {recentPosts.map((post) => (
                  <Stack key={post.id} direction="row" justifyContent="space-between" alignItems="center"
                    onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/${post.id}`; }}
                    sx={{ p: 1.5, border: '1px solid #F0F0F0', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{post.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{getSocialAccount(post.brandProfileId)?.socialNetwork ?? '—'}</Typography>
                    </Box>
                    <StatusChip status={post.status} />
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </div>
      </div>
    </Box>
  );
}
