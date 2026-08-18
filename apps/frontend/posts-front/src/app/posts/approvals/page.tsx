'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { PrimaryButton, useToast, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { NETWORK_DISPLAY_COLORS, NETWORK_SHORT_LABELS } from '../../../lib/mock-data';
import {
  useListPostsQuery,
  useSubmitForReviewMutation,
  useApprovePostMutation,
  useRejectPostMutation,
  type RealPostListItem,
} from '../../../store/api/posts.api';
import { useListCampaignsQuery } from '../../../store/api/campaigns.api';
import { NetworkAvatar } from '../../../components/NetworkAvatar';
import { PostsTabs } from '../../../components/PostsTabs';
import { RejectPostDialog } from '../../../components/RejectPostDialog';

function NetworkAvatarForPost({ post, size }: { post: RealPostListItem; size?: number }) {
  const code = post.socialNetworks[0]?.socialNetwork.code;
  const colors = code ? NETWORK_DISPLAY_COLORS[code] : undefined;
  return <NetworkAvatar network={code ? NETWORK_SHORT_LABELS[code] : '—'} networkBg={colors?.bg ?? '#EEEEEE'} networkColor={colors?.color ?? '#666666'} size={size} />;
}

function postTitle(content: string): string {
  return content.length > 100 ? `${content.slice(0, 100)}...` : content;
}

// Fase O — 5 secciones por audiencia (antes 3, sin distinguir para quién era
// cada una): CM revisa en_revision/rechazado_cliente, Cliente ve aprobado
// (informativo, la acción real vive en el detalle), Diseñador/CM corrigen
// rechazado/borrador. listPosts ya scopea server-side qué puede ver cada
// quien — las secciones solo deciden qué ACCIONES mostrar, no qué datos.
export default function PostsApprovalPage() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const { showSuccess, showError } = useToast();
  const { can, canAny } = usePermissions();
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const roles = user?.roles ?? [];
  const isCm = roles.includes('community_manager');
  const isDesigner = roles.includes('disenador');
  const isClient = roles.includes('cliente');
  // Aprobar/Rechazar es la acción protegida — se gatea por permiso, no por
  // rol. El resto de esta pantalla (a quién le toca ver qué cola, reenviar a
  // revisión) sigue siendo lógica de negocio por rol, sin tocar.
  const canReviewPublicaciones = canAny('publicaciones', ['aprobar', 'rechazar']);

  const { data: campaigns = [] } = useListCampaignsQuery();
  const { data: draftPosts = [] } = useListPostsQuery({ status: 'borrador' });
  const { data: reviewPosts = [] } = useListPostsQuery({ status: 'en_revision' });
  const { data: clientRejectedPosts = [] } = useListPostsQuery({ status: 'rechazado_cliente' });
  const { data: pendingClientPosts = [] } = useListPostsQuery({ status: 'aprobado' });
  const { data: rejectedPosts = [] } = useListPostsQuery({ status: 'rechazado' });

  const [submitForReview] = useSubmitForReviewMutation();
  const [approvePost] = useApprovePostMutation();
  const [rejectPost] = useRejectPostMutation();

  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  async function handleSubmitForReview(id: string) {
    try {
      await submitForReview(id).unwrap();
      showSuccess('Publicación enviada a revisión.');
    } catch {
      showError('No se pudo enviar a revisión.');
    }
  }

  async function handleApprove(id: string) {
    try {
      await approvePost(id).unwrap();
      showSuccess('Publicación aprobada — pasó al Cliente.');
    } catch {
      showError('No se pudo aprobar la publicación.');
    }
  }

  async function handleConfirmReject(reason: string) {
    const id = rejectTargetId;
    if (!id) return;
    try {
      await rejectPost({ id, comment: reason }).unwrap();
      showSuccess('Publicación rechazada — regresó al Diseñador.');
    } catch {
      showError('No se pudo rechazar la publicación.');
    } finally {
      setRejectTargetId(null);
    }
  }

  function PostCard({
    post,
    statusChip,
    actions,
  }: {
    post: RealPostListItem;
    statusChip?: ReactNode;
    actions: ReactNode;
  }) {
    return (
      <Card
        key={post.id}
        elevation={0}
        onClick={() => router.push(`/posts/${post.id}`)}
        sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
            <Stack direction="row" gap={1} alignItems="center">
              <NetworkAvatarForPost post={post} size={32} />
              <Typography fontWeight={600}>{postTitle(post.content).slice(0, 40)}</Typography>
              <Typography variant="caption" color="text.secondary">{campaignById.get(post.campaignId)?.name ?? 'Sin campaña'}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {new Date(post.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </Typography>
          </Stack>
          <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
            <Typography variant="body2">{postTitle(post.content)}</Typography>
          </Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            {statusChip ?? <span />}
            <Stack direction="row" gap={1}>{actions}</Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const viewButton = (id: string) => (
    <Button
      size="small"
      startIcon={<VisibilityOutlinedIcon fontSize="small" />}
      onClick={(e) => { e.stopPropagation(); router.push(`/posts/${id}`); }}
      sx={{ color: 'secondary.main' }}
    >
      Ver detalle
    </Button>
  );

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh' }}>
      <PostsTabs />
      <Box sx={{ p: 3 }}>
      <Stack direction="row" gap={1.5} mb={3} flexWrap="wrap">
        {canReviewPublicaciones && <Chip label={`${reviewPosts.length} para revisar`} sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }} />}
        {isCm && <Chip label={`${clientRejectedPosts.length} rechazadas por el cliente`} sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />}
        <Chip label={`${pendingClientPosts.length} esperando al cliente`} sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
        <Chip label={`${rejectedPosts.length} rechazadas por el CM`} sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
        <Chip label={`${draftPosts.length} borradores`} sx={{ bgcolor: '#F5F5F5', color: '#616161', fontWeight: 600 }} />
      </Stack>

      {canReviewPublicaciones && (
        <>
          <Typography variant="subtitle1" mb={2}>Para revisar</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Revisa el trabajo de tus Diseñadores antes de enviarlo al Cliente.
          </Alert>
          {reviewPosts.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={3}>Sin publicaciones para revisar.</Typography>
          )}
          {reviewPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              actions={
                <>
                  {viewButton(post.id)}
                  {can('publicaciones', 'rechazar') && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => { e.stopPropagation(); setRejectTargetId(post.id); }}
                      sx={{ color: '#C62828', borderColor: '#C62828' }}
                    >
                      Rechazar
                    </Button>
                  )}
                  {can('publicaciones', 'aprobar') && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => { e.stopPropagation(); handleApprove(post.id); }}
                      sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
                    >
                      Aprobar
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </>
      )}

      {isCm && (
        <>
          <Typography variant="subtitle1" mt={4} mb={2}>Rechazadas por el Cliente</Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            El Cliente pidió correcciones — entra al detalle para editarla tú o regresarla al Diseñador.
          </Alert>
          {clientRejectedPosts.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={3}>Sin publicaciones rechazadas por el Cliente.</Typography>
          )}
          {clientRejectedPosts.map((post) => (
            <PostCard key={post.id} post={post} actions={viewButton(post.id)} />
          ))}
        </>
      )}

      <Typography variant="subtitle1" mt={4} mb={2}>Esperando al Cliente</Typography>
      <Alert severity="success" sx={{ mb: 2 }}>
        Ya pasaron la revisión del CM y esperan aprobación del Cliente (programar o rechazar, desde el detalle).
      </Alert>
      {pendingClientPosts.length === 0 && (
        <Typography variant="body2" color="text.secondary" mb={3}>Sin publicaciones esperando al Cliente.</Typography>
      )}
      {pendingClientPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          statusChip={<Chip size="small" label="En espera del cliente" sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }} />}
          actions={viewButton(post.id)}
        />
      ))}

      {(isDesigner || isCm) && (
        <>
          <Typography variant="subtitle1" mt={4} mb={2}>Rechazadas por el CM — corrígelas</Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            El CM pidió correcciones. Edítalas y reenvíalas a revisión.
          </Alert>
          {rejectedPosts.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={3}>Sin publicaciones rechazadas.</Typography>
          )}
          {rejectedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              actions={
                <>
                  {viewButton(post.id)}
                  <PrimaryButton size="small" onClick={(e) => { e.stopPropagation(); handleSubmitForReview(post.id); }}>
                    Reenviar a revisión →
                  </PrimaryButton>
                </>
              }
            />
          ))}
        </>
      )}

      {(isDesigner || isCm || isClient) && (
        <>
          <Typography variant="subtitle1" mt={4} mb={2}>Borradores</Typography>
          {draftPosts.length === 0 && (
            <Typography variant="body2" color="text.secondary" mb={3}>Sin borradores pendientes.</Typography>
          )}
          {draftPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              actions={
                <>
                  {viewButton(post.id)}
                  <PrimaryButton size="small" onClick={(e) => { e.stopPropagation(); handleSubmitForReview(post.id); }}>
                    Enviar a revisión →
                  </PrimaryButton>
                </>
              }
            />
          ))}
        </>
      )}
      </Box>
      <RejectPostDialog open={!!rejectTargetId} onClose={() => setRejectTargetId(null)} onConfirm={handleConfirmReject} />
    </Box>
  );
}
