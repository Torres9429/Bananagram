'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { StatusChip, usePermissions, PrimaryButton } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { getInitials } from '@repo/ui/utils';
import { ZONE_URLS } from '@repo/ui/config';
import {
  MOCK_CAMPAIGNS,
  MOCK_POSTS_BY_CAMPAIGN,
  MOCK_TEAM_BY_CAMPAIGN,
  MOCK_PROFILES,
  CAMPAIGN_STATUS_LABEL,
  getSocialAccount,
} from '../../../../lib/mock-data';

// Detalle operativo de campaña en /profile — mismo contenido que
// brands-front/app/brands/[id]/campaigns/[campaignId], pero SIN CampaignTabs
// (esa barra pertenece al flujo legacy de navegación por marca). Equipo y
// publicaciones recientes se muestran inline en la misma pantalla — no hace
// falta navegar para ver un resumen de ambos; "Ver todas"/"Ver equipo" siguen
// llevando al detalle completo cuando se necesita.
//
// Compartido por los 3 roles (§1/§2 modernización de campañas CM/Diseñador):
// Cliente llega desde /profile/campaigns, CM/Diseñador desde /my-campaigns.
// El perfil se resuelve por campaign.brandId (no por el usuario logueado) —
// es lo único que funciona igual sin importar quién esté viendo la campaña.
export default function ProfileCampaignDetailPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const params = useParams<{ campaignId: string }>();
  const user = useSelector(selectUser);
  const role = user?.role ?? '';
  const isClient = role === 'cliente';
  const isDesigner = role === 'disenador';
  const backHref = isClient ? '/profile' : '/my-campaigns';
  const backLabel = isClient ? 'Volver a mi perfil' : 'Volver a mis campañas';
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === params.campaignId) ?? MOCK_CAMPAIGNS[0];
  const profile = MOCK_PROFILES.find((p) => p.id === campaign.brandId) ?? MOCK_PROFILES[0];
  const posts = MOCK_POSTS_BY_CAMPAIGN[campaign.id] ?? [];
  const team = MOCK_TEAM_BY_CAMPAIGN[campaign.id] ?? [];
  const published = posts.filter((p) => p.status === 'publicado').length;
  const progress = posts.length ? Math.round((published / posts.length) * 100) : 0;
  const statusStyle = CAMPAIGN_STATUS_LABEL[campaign.status];
  const recentPosts = posts.slice(0, 3);
  const cm = team.find((m) => m.role === 'Community Manager');
  const designers = team.filter((m) => m.role !== 'Community Manager' && m.role !== 'Cliente');

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', px: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tooltip title={backLabel}>
            <IconButton onClick={() => router.push(backHref)} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{campaign.name}</Typography>
            <Typography variant="body2" color="text.secondary">{profile.name} · {campaign.startDate} – {campaign.endDate}</Typography>
          </Box>
          <Chip label={statusStyle.label} sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }} />
        </Stack>

        {/* Accesos claros — equipo oculto para Diseñador (no gestiona
            equipo); aprobaciones solo para Cliente (post:approve) */}
        <Stack direction="row" gap={1.5} flexWrap="wrap" mb={3}>
          <Button
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
            onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts?campaign=${campaign.id}`; }}
            sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
          >
            Ver todas las publicaciones
          </Button>
          {!isDesigner && (
            <Button
              variant="outlined"
              startIcon={<GroupOutlinedIcon />}
              onClick={() => router.push(`/profile/campaigns/${campaign.id}/team`)}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
            >
              Ver equipo
            </Button>
          )}
          {can('post', 'approve') && (
            <Button
              variant="outlined"
              startIcon={<RateReviewOutlinedIcon />}
              onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/approvals`; }}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
            >
              Ver aprobaciones
            </Button>
          )}
          {can('post', 'create') && (
            <PrimaryButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/new`; }}
            >
              Crear publicación
            </PrimaryButton>
          )}
        </Stack>

        <Grid container spacing={2} mb={3}>
          {/* Resumen de campaña */}
          <Grid item xs={12} md={isDesigner ? 12 : 6}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>Publicaciones</Typography>
              <Typography variant="h4" fontWeight={700} mb={1}>{campaign.postsCount}</Typography>
              <Typography variant="caption" color="text.secondary">{published} publicadas de {posts.length} registradas</Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: '#F5F5F5', '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main' } }}
              />
            </Paper>
          </Grid>

          {/* Equipo asignado — resumen inline, oculto para Diseñador */}
          {!isDesigner && (
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Equipo asignado</Typography>
                {team.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin equipo asignado todavía.</Typography>
                ) : (
                  <Stack gap={1.25}>
                    {cm && (
                      <Stack direction="row" gap={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: cm.avatarBg, color: cm.avatarColor, width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>
                          {getInitials(cm.name)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{cm.name}</Typography>
                          <Typography variant="caption" color="text.secondary">Community Manager</Typography>
                        </Box>
                      </Stack>
                    )}
                    {designers.slice(0, 2).map((d) => (
                      <Stack key={d.id} direction="row" gap={1.5} alignItems="center">
                        <Avatar sx={{ bgcolor: d.avatarBg, color: d.avatarColor, width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>
                          {getInitials(d.name)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{d.role}</Typography>
                        </Box>
                      </Stack>
                    ))}
                    {designers.length > 2 && (
                      <Typography variant="caption" color="text.secondary">+{designers.length - 2} más — ver equipo completo</Typography>
                    )}
                  </Stack>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>

        {/* Publicaciones recientes — resumen inline */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" color="text.secondary">Publicaciones recientes</Typography>
            {posts.length > 3 && (
              <Typography
                variant="caption"
                onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts?campaign=${campaign.id}`; }}
                sx={{ color: 'primary.contrastTextMuted', fontWeight: 600, cursor: 'pointer' }}
              >
                Ver todas →
              </Typography>
            )}
          </Stack>
          {recentPosts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin publicaciones registradas todavía.</Typography>
          ) : (
            <Stack gap={0}>
              {recentPosts.map((p) => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid #F0F0F0' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{p.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getSocialAccount(p.brandProfileId)?.socialNetwork ?? '—'} · {p.scheduledAt}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={0.5} alignItems="center">
                    <StatusChip status={p.status} />
                    <Tooltip title="Ver publicación">
                      <IconButton
                        size="small"
                        onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/${p.id}`; }}
                        sx={{ color: 'secondary.main' }}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
