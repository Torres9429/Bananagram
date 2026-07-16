'use client';

import { useState } from 'react';
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
import Snackbar from '@mui/material/Snackbar';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ProtectedAction, usePermissions, PrimaryButton } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { findUserByEmail } from '@repo/ui';
import { MOCK_POSTS, addStatusHistoryEntry, getPostNetworkInfo } from '../../../lib/mock-data';
import type { MockPost, StatusHistoryItem } from '../../../interfaces/interface';
import { NetworkAvatar } from '../../../components/NetworkAvatar';
import { CampaignDot } from '../../../components/CampaignDot';
import { PostsTabs } from '../../../components/PostsTabs';
import { RejectPostDialog } from '../../../components/RejectPostDialog';

export default function PostsApprovalPage() {
  const router = useRouter();
  const { can, canAny } = usePermissions();
  const user = useSelector(selectUser);
  // Mock: estado local, sin persistencia — mismo patrón ya usado en
  // ClientSection.tsx (brands-front) para acciones sin backend real.
  const [posts, setPosts] = useState<MockPost[]>(MOCK_POSTS);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  function handleApprove(id: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'aprobado' } : p)));
    setFeedback('Publicación aprobada.');
  }

  // Rechazar pide motivo en un modal (§3) — el estado y el historial solo se
  // actualizan al confirmar, nunca al abrir el modal.
  function handleConfirmReject(reason: string) {
    const id = rejectTargetId;
    if (!id) return;
    const actor = findUserByEmail(user?.email ?? '')?.name ?? user?.email ?? 'Cliente';
    const entry: StatusHistoryItem = {
      status: 'rechazado',
      label: 'Rechazado',
      color: '#C62828',
      actor,
      role: 'Cliente',
      date: new Date().toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      comment: reason,
    };
    addStatusHistoryEntry(id, entry);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'rechazado', rejectionReason: reason } : p)));
    setFeedback('Publicación rechazada.');
    setRejectTargetId(null);
  }

  const draftPosts = posts.filter((p) => p.status === 'borrador');
  const reviewPosts = posts.filter((p) => p.status === 'en_revision');
  const rejectedPosts = posts.filter((p) => p.status === 'rechazado');

  const showDraftsSection = can('post', 'create');
  // El CM también debe ver esta sección (en espera del cliente), aunque no tenga
  // approve/reject — solo se le ocultan los botones de acción vía ProtectedAction.
  const showReviewSection = canAny('post', ['create', 'approve', 'reject']);
  const showRejectedSection = can('post', 'create');

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh' }}>
      <PostsTabs />
      <Box sx={{ p: 3 }}>
      <Stack direction="row" gap={1.5} mb={3} flexWrap="wrap">
        <Chip label={`${draftPosts.length} para revisar`} sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
        <Chip
          label={`${reviewPosts.length} listos para cliente`}
          sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }}
        />
        <Chip label={`${rejectedPosts.length} rechazados`} sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
      </Stack>

      {showDraftsSection && (
        <>
          <Typography variant="subtitle1" mb={2}>
            Borradores por enviar a revisión
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Revisa el trabajo de tus diseñadores antes de enviarlo al cliente.
          </Alert>
          {draftPosts.map((post) => (
            <Card
              key={post.id}
              elevation={0}
              onClick={() => router.push(`/posts/${post.id}`)}
              sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <NetworkAvatar {...getPostNetworkInfo(post)} size={32} />
                    <Typography fontWeight={600}>{post.title}</Typography>
                    {post.campaign && <CampaignDot color={post.campaign.color} name={post.campaign.name} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {post.createdAt}
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                  <Typography variant="body2">
                    {post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} justifyContent="flex-end">
                  <Button
                    size="small"
                    startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                    onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}`); }}
                    sx={{ color: 'secondary.main' }}
                  >
                    Ver detalle
                  </Button>
                  <PrimaryButton size="small" onClick={(e) => e.stopPropagation()}>
                    Enviar a revisión →
                  </PrimaryButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {showReviewSection && (
        <>
          <Typography variant="subtitle1" mt={4} mb={2}>
            Esperando aprobación del cliente
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            Estas publicaciones ya pasaron tu revisión y esperan aprobación del cliente.
          </Alert>
          {reviewPosts.map((post) => (
            <Card
              key={post.id}
              elevation={0}
              onClick={() => router.push(`/posts/${post.id}`)}
              sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <NetworkAvatar {...getPostNetworkInfo(post)} size={32} />
                    <Typography fontWeight={600}>{post.title}</Typography>
                    {post.campaign && <CampaignDot color={post.campaign.color} name={post.campaign.name} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {post.createdAt}
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                  <Typography variant="body2">
                    {post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <Chip size="small" label="En espera del cliente" sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600 }} />
                  <Stack direction="row" gap={1}>
                    <Button
                      size="small"
                      startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}`); }}
                      sx={{ color: 'secondary.main' }}
                    >
                      Ver detalle
                    </Button>
                    <ProtectedAction module="post" action="reject">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); setRejectTargetId(post.id); }}
                        sx={{ color: '#C62828', borderColor: '#C62828' }}
                      >
                        Rechazar
                      </Button>
                    </ProtectedAction>
                    <ProtectedAction module="post" action="approve">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={(e) => { e.stopPropagation(); handleApprove(post.id); }}
                        sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
                      >
                        Aprobar
                      </Button>
                    </ProtectedAction>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {showRejectedSection && (
        <>
          <Typography variant="subtitle1" mt={4} mb={2}>
            Rechazados — requieren corrección
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            El cliente rechazó estas publicaciones con comentarios. Corrígelas y reenvíalas.
          </Alert>
          {rejectedPosts.map((post) => (
            <Card
              key={post.id}
              elevation={0}
              onClick={() => router.push(`/posts/${post.id}`)}
              sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <NetworkAvatar {...getPostNetworkInfo(post)} size={32} />
                    <Typography fontWeight={600}>{post.title}</Typography>
                    {post.campaign && <CampaignDot color={post.campaign.color} name={post.campaign.name} />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {post.createdAt}
                  </Typography>
                </Stack>
                <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                  <Typography variant="body2">
                    {post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}
                  </Typography>
                </Box>
                {post.rejectionReason && (
                  <Box sx={{ bgcolor: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: 1.5, p: 1.5, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#C62828' }}>
                      {post.rejectionReason}
                    </Typography>
                  </Box>
                )}
                <Stack direction="row" justifyContent="flex-end" gap={1}>
                  <Button
                    size="small"
                    startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                    onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}`); }}
                    sx={{ color: 'secondary.main' }}
                  >
                    Ver detalle
                  </Button>
                  <ProtectedAction module="post" action="create">
                    <PrimaryButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); router.push('/posts/new'); }}
                    >
                      Editar y reenviar →
                    </PrimaryButton>
                  </ProtectedAction>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}
      </Box>
      <Snackbar
        open={!!feedback}
        autoHideDuration={2500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={feedback}
      />
      <RejectPostDialog
        open={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        onConfirm={handleConfirmReject}
      />
    </Box>
  );
}
