'use client';

import { useState } from 'react';
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
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { usePermissions, PrimaryButton, StatusChip } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { getInitials, formatDateRange } from '@repo/ui/utils';
import { ZONE_URLS } from '@repo/ui/config';
import { useGetCampaignMetricsQuery, useRefreshCampaignMetricsMutation } from '../../../../../store/api/metrics.api';
import {
  useGetCampaignQuery,
  useListEligibleCMsQuery,
  useListEligibleDesignersQuery,
} from '../../../../../store/api/campaigns.api';
import { useGetBrandQuery } from '../../../../../store/api/brands.api';
import { useListPostsByCampaignQuery } from '../../../../../store/api/posts.api';
import { ReassignCmDialog } from '../../../../../components/ReassignCmDialog';
import { GenerateIdeasSection } from '../../../../../components/GenerateIdeasSection';
import { CAMPAIGN_STATUS_LABEL } from '../../../../../lib/mock-data';

const CM_STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: 'Pendiente de aprobación del CM', bg: '#FFF8E1', color: '#8D6E00' },
  aceptada: { label: 'CM confirmado', bg: '#E8F5E9', color: '#2E7D32' },
  rechazada: { label: 'Rechazada por el CM', bg: '#FFEBEE', color: '#C62828' },
};

// Fase M: única URL de detalle de campaña — antes existía duplicada también en
// /profile/campaigns/[campaignId] (borrada), lo que causaba que un fix
// aplicado a una no llegara a la otra (ej. el motivo de rechazo). "Publicaciones
// recientes" no tiene fuente real todavía (posts-front sigue mock, sin
// POST /posts conectado a ninguna UI) — se deja como estado vacío honesto.
export default function CampaignDetailPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const params = useParams<{ id: string; campaignId: string }>();
  const user = useSelector(selectUser);
  // Antes: role = user?.roles?.[0] — se rompía silenciosamente para
  // usuarios multi-rol (ej. multi@bananagram.mx) al depender solo del
  // primer rol del arreglo (auditoría final, hallazgo real). Mismo criterio
  // "¿es dueño/gestor de marca?" ya usado en Sidebar/profile/my-campaigns —
  // la diferencia de contexto (volver a /profile vs. /my-campaigns) se
  // mantiene como decisión de UX, no de autorización.
  const hasProfileAccess = can('marcas', 'crear') || can('marcas', 'editar');
  const backHref = hasProfileAccess ? '/profile' : '/my-campaigns';
  const backLabel = hasProfileAccess ? 'Volver a mi perfil' : 'Volver a mis campañas';

  const { data: campaign, isFetching: isLoadingCampaign } = useGetCampaignQuery(params.campaignId);
  const { data: brand } = useGetBrandQuery(campaign?.brandId ?? '', { skip: !campaign?.brandId });
  const { data: allCMs = [] } = useListEligibleCMsQuery([]);
  const { data: allDesigners = [] } = useListEligibleDesignersQuery();

  const { data: metrics, isFetching: isLoadingMetrics } = useGetCampaignMetricsQuery(params.campaignId);
  const [refreshMetrics, { isLoading: isRefreshingMetrics }] = useRefreshCampaignMetricsMutation();
  const { data: recentPosts = [] } = useListPostsByCampaignQuery(params.campaignId);
  const [reassignOpen, setReassignOpen] = useState(false);

  if (isLoadingCampaign) return null;
  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Esta campaña no existe o no tienes acceso a ella.</Alert>
      </Box>
    );
  }

  const cm = allCMs.find((c) => c.userId === campaign.cmId) ?? null;
  const assignedDesigners = (campaign.designers ?? []).map((d) => {
    const profile = allDesigners.find((ed) => ed.userId === d.userId);
    return { userId: d.userId, name: profile?.name ?? 'Usuario', avatarUrl: profile?.avatarUrl ?? null };
  });
  const statusStyle = CAMPAIGN_STATUS_LABEL[campaign.status];
  const cmStatusStyle = CM_STATUS_LABEL[campaign.cmStatus];

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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{campaign.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {brand?.name ?? '—'} · {formatDateRange(campaign.startDate, campaign.endDate)}
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Chip label={cmStatusStyle.label} sx={{ bgcolor: cmStatusStyle.bg, color: cmStatusStyle.color, fontWeight: 700 }} />
            <Chip label={statusStyle.label} sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700 }} />
          </Stack>
        </Stack>

        {campaign.cmStatus === 'rechazada' && hasProfileAccess && (
          <Alert
            severity="warning"
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button color="warning" size="small" onClick={() => setReassignOpen(true)}>
                Elegir otro CM
              </Button>
            }
          >
            {cm?.name ?? 'El Community Manager'} rechazó esta campaña
            {campaign.cmRejectionReason ? `: "${campaign.cmRejectionReason}"` : ''}.
          </Alert>
        )}

        {/* Antes: "Ver equipo" oculto para Diseñador vía isDesigner (nombre
            de rol crudo). team/page.tsx no tiene su propio gate de
            visibilidad — cualquiera que llegue a ver esta campaña puede ver
            su roster; solo gestionar (agregar/quitar) está detrás de
            campanas:asignar (canManage, ya real en team/page.tsx). No existe
            un permiso que signifique "puede ver el equipo" distinto de
            "puede ver la campaña", así que se muestra a todos por igual. */}
        <Stack direction="row" gap={1.5} flexWrap="wrap" mb={3}>
          <Button
            variant="outlined"
            startIcon={<ArticleOutlinedIcon />}
            onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts?campaign=${campaign.id}`; }}
            sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
          >
            Ver todas las publicaciones
          </Button>
          <Button
            variant="outlined"
            startIcon={<GroupOutlinedIcon />}
            onClick={() => router.push(`/brands/${params.id}/campaigns/${campaign.id}/team`)}
            sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
          >
            Ver equipo
          </Button>
          {can('publicaciones', 'aprobar') && (
            <Button
              variant="outlined"
              startIcon={<RateReviewOutlinedIcon />}
              onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/approvals`; }}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
            >
              Ver aprobaciones
            </Button>
          )}
          {can('publicaciones', 'crear') && (
            <PrimaryButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/new`; }}
            >
              Crear publicación
            </PrimaryButton>
          )}
        </Stack>

        {/* Antes un botón que abría GenerateIdeasDialog en un modal (tapaba
            el resto del detalle de campaña) — ahora una sección contraible
            en el propio flujo de la página, mismo patrón que
            AiAssistantSection/SuggestCaptionPanel en posts-front. */}
        {can('ideas', 'crear') && (
          <GenerateIdeasSection campaignId={campaign.id} brandName={brand?.name} />
        )}

        {/* Equipo asignado — resumen inline, mismo criterio que el botón de
            arriba: visible para todo el que puede ver la campaña. */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Equipo asignado</Typography>
            {!cm && assignedDesigners.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin equipo asignado todavía.</Typography>
            ) : (
              <Stack gap={1.25}>
                {cm && (
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Avatar src={cm.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>{getInitials(cm.name)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{cm.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Community Manager</Typography>
                    </Box>
                  </Stack>
                )}
                {assignedDesigners.slice(0, 2).map((d) => (
                  <Stack key={d.userId} direction="row" gap={1.5} alignItems="center">
                    <Avatar src={d.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>{getInitials(d.name)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Diseñador</Typography>
                    </Box>
                  </Stack>
                ))}
                {assignedDesigners.length > 2 && (
                  <Typography variant="caption" color="text.secondary">+{assignedDesigners.length - 2} más — ver equipo completo</Typography>
                )}
              </Stack>
            )}
          </Paper>

        {/* Publicaciones recientes — real desde la Fase N (GET /posts?
            campaignId=, posts-front ya tiene su propia UI completa). Cross-
            zona: llamada directa al mismo backend, no se importa el store
            de posts-front (Multi-Zones, cada zona es standalone). */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>Publicaciones recientes</Typography>
          {recentPosts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin publicaciones todavía para esta campaña.
            </Typography>
          ) : (
            <Stack gap={1.5}>
              {recentPosts.slice(0, 5).map((post) => (
                <Stack
                  key={post.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1.5}
                  onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/${post.id}`; }}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                >
                  <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.content.split('\n')[0] || 'Sin contenido'}
                  </Typography>
                  <StatusChip status={post.status} />
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Métricas — reales (GET /campaigns/:id/metrics), ver Fase I. */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" color="text.secondary">Métricas</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={() => refreshMetrics(params.campaignId)}
              disabled={isRefreshingMetrics}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
            >
              {isRefreshingMetrics ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </Stack>
          {isLoadingMetrics ? (
            <Typography variant="body2" color="text.secondary">Cargando métricas…</Typography>
          ) : !metrics || metrics.summary.externalDeliveries === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin métricas todavía — se generan automáticamente después de publicar un post real.
            </Typography>
          ) : (
            <Stack gap={2}>
              <Grid container spacing={2}>
                {[
                  { label: 'Likes', value: metrics.summary.likes },
                  { label: 'Comentarios', value: metrics.summary.comments },
                  { label: 'Compartidos', value: metrics.summary.shares },
                  { label: 'Vistas', value: metrics.summary.views },
                  { label: 'Alcance', value: metrics.summary.reach },
                  { label: 'Interacciones', value: metrics.summary.interactions },
                ].map((item) => (
                  <Grid item xs={6} sm={4} md={2} key={item.label}>
                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={700}>{item.value.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {metrics.byNetwork.length > 0 && (
                <Stack gap={1}>
                  {metrics.byNetwork.map((n) => (
                    <Stack
                      key={n.networkCode}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                    >
                      <Typography variant="body2" fontWeight={600}>{n.networkName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {n.likes} likes · {n.comments} comentarios · {n.engagementRate !== null ? `${n.engagementRate}% engagement` : 'sin engagement calculable'}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}

              <Typography variant="caption" color="text.secondary">
                {metrics.dataStatus.lastSyncedAt
                  ? `Última sincronización: ${new Date(metrics.dataStatus.lastSyncedAt).toLocaleString()}`
                  : 'Todavía sin sincronizar'}
                {metrics.dataStatus.partial && ` · Faltan datos de: ${metrics.dataStatus.missingNetworks.join(', ')}`}
              </Typography>
            </Stack>
          )}
        </Paper>
      </Box>

      <ReassignCmDialog
        open={reassignOpen}
        campaignId={campaign.id}
        categoryIds={campaign.categories?.map((c) => c.categoryId) ?? []}
        onClose={() => setReassignOpen(false)}
      />
    </Box>
  );
}
