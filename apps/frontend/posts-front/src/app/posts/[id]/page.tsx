'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { StatusChip, ProtectedAction, PrimaryButton } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { findUserByEmail } from '@repo/ui';
import { MOCK_POSTS, MOCK_STATUS_HISTORY, addStatusHistoryEntry, getPostNetworkInfo, getMedia } from '../../../lib/mock-data';
import type { PostSocialAccountStatus, StatusHistoryItem } from '../../../interfaces/interface';
import { RejectPostDialog } from '../../../components/RejectPostDialog';

// Estado POR RED (PostSocialAccountStatus) — distinto de PostStatus (el
// estado agregado del post, cubierto por StatusChip de @repo/ui). Este mapa
// es local a esta vista porque solo /posts/[id] expone el detalle por red
// (ver docs/frontend-db-alignment.md decisión §3): la lista y el kanban solo
// muestran el PostStatus agregado.
const PSA_STATUS_STYLES: Record<PostSocialAccountStatus, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#F5F5F5', color: '#616161', label: 'Pendiente' },
  publicando: { bg: '#E1F5FE', color: '#0277BD', label: 'Publicando' },
  publicado: { bg: '#E8F5E9', color: '#2E7D32', label: 'Publicado' },
  error: { bg: '#FDE2E2', color: '#B71C1C', label: 'Error' },
  cancelado: { bg: '#EEEEEE', color: '#757575', label: 'Cancelado' },
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Mock: estado local, sin persistencia — mismo patrón ya usado en
  // /posts/approvals y en ClientSection.tsx (brands-front).
  const [post, setPost] = useState(() => MOCK_POSTS.find((p) => p.id === params.id) ?? MOCK_POSTS.find((p) => p.id === 'p2')!);
  const [history, setHistory] = useState<StatusHistoryItem[]>(() => MOCK_STATUS_HISTORY[post.id] ?? []);
  const [rejectOpen, setRejectOpen] = useState(false);
  const user = useSelector(selectUser);

  // Vista previa (columna derecha) y resumen: representan la primera red del
  // post — el detalle completo de TODAS las redes vive en la sección de
  // abajo ("Estado por red"), que es la que permite ver el caso `parcial`.
  const primaryAccountId = post.socialAccounts[0]?.socialAccountId;
  const { networkLabel, networkShort, networkBg, networkColor, brand } = getPostNetworkInfo(primaryAccountId);
  const primaryAccount = post.socialAccounts[0];

  // Media adjunta (PostMedia) — ordenada por MockPost.media[].order, resuelta
  // contra MOCK_MEDIA_LIBRARY. Puede no haber ninguna (la mayoría de los
  // MOCK_POSTS no tienen media todavía).
  const postMedia = [...(post.media ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((pm) => getMedia(pm.mediaId))
    .filter((m): m is NonNullable<typeof m> => !!m);

  function handleApprove() {
    setPost((prev) => ({ ...prev, status: 'aprobado' }));
  }

  // Rechazar pide motivo en un modal (§3) — el estado y el historial solo se
  // actualizan al confirmar, nunca al abrir el modal.
  function handleConfirmReject(reason: string) {
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
    addStatusHistoryEntry(post.id, entry);
    setHistory((prev) => [entry, ...prev]);
    setPost((prev) => ({ ...prev, status: 'rechazado', rejectionReason: reason }));
    setRejectOpen(false);
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Tooltip title="Volver">
        <IconButton
          onClick={() => router.back()}
          sx={{ mb: 2, bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFF8E1' } }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                {post.title}
              </Typography>
              <StatusChip status={post.status} />
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack gap={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Redes
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {post.socialAccounts.length === 0
                    ? 'Sin redes asignadas'
                    : post.socialAccounts.length === 1
                      ? networkLabel
                      : `${post.socialAccounts.length} redes (ver detalle abajo)`}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Campaña
                </Typography>
                {post.campaign ? (
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ color: '#1565C0', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                    onClick={() => router.push(`/brands/campaigns/${post.campaign!.id}`)}
                  >
                    {post.campaign.name}
                  </Typography>
                ) : (
                  <Typography variant="body2" fontWeight={500}>
                    Sin campaña
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Diseñador
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {post.designer}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Enviado el
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  25 jun, 14:30
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
              <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </Typography>
            </Box>

            {/* Media adjunta (Media/PostMedia) — thumbnails simples, sin más
                interacción que un link a la URL del archivo. */}
            {postMedia.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap" mt={1.5}>
                {postMedia.map((m) => (
                  <Box
                    key={m.id}
                    component="a"
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ position: 'relative', width: 72, height: 72, display: 'block' }}
                  >
                    <Box
                      component="img"
                      src={m.url}
                      alt={m.originalName}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid #E8E8E8' }}
                    />
                    {m.mimeType.startsWith('video') && (
                      <Chip
                        label="Video"
                        size="small"
                        sx={{ position: 'absolute', bottom: 2, left: 2, height: 16, fontSize: 8, bgcolor: 'rgba(0,0,0,0.65)', color: '#fff' }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            <Stack direction="row" gap={1.5} mt={3} flexWrap="wrap">
              <ProtectedAction module="post" action="create">
                <Button
                  variant="outlined"
                  sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
                  onClick={() => router.push('/posts/new')}
                >
                  Editar
                </Button>
              </ProtectedAction>
              <ProtectedAction module="post" action="create">
                <PrimaryButton onClick={() => router.push('/posts/new')}>
                  Enviar a revisión →
                </PrimaryButton>
              </ProtectedAction>
              <ProtectedAction module="post" action="schedule">
                <Button variant="contained" sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}>
                  Programar
                </Button>
              </ProtectedAction>
              <ProtectedAction module="post" action="reject">
                <Button variant="outlined" onClick={() => setRejectOpen(true)} sx={{ color: '#C62828', borderColor: '#C62828' }}>
                  Rechazar
                </Button>
              </ProtectedAction>
              <ProtectedAction module="post" action="approve">
                <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>
                  Aprobar
                </Button>
              </ProtectedAction>
              <Button
                variant="outlined"
                sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
                onClick={() => router.push('/brands/campaigns/c2')}
              >
                Ver campaña →
              </Button>
            </Stack>
          </Paper>

          {/* Estado por red — PostSocialAccount, una fila por red (ver
              docs/frontend-db-alignment.md §1.1). Es lo único que hace visible
              el caso `parcial` (una red publicada, otra con error). */}
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Estado por red
            </Typography>
            {post.socialAccounts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Este post no tiene redes asignadas.
              </Typography>
            ) : (
              <Stack gap={1.5}>
                {post.socialAccounts.map((sa) => {
                  const info = getPostNetworkInfo(sa.socialAccountId);
                  const style = PSA_STATUS_STYLES[sa.status];
                  return (
                    <Box key={sa.id} sx={{ border: '1px solid #E8E8E8', borderRadius: 2, p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Stack direction="row" gap={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: info.networkBg, color: info.networkColor, fontSize: 11, fontWeight: 600 }}>
                            {info.networkShort}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {info.networkLabel}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {info.brand}
                            </Typography>
                          </Box>
                        </Stack>
                        <Chip
                          size="small"
                          label={style.label}
                          sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: 10 }}
                        />
                      </Stack>
                      {sa.postUrl && (
                        <Stack direction="row" gap={0.5} alignItems="center" mt={1}>
                          <OpenInNewIcon sx={{ fontSize: 14, color: '#1565C0' }} />
                          <Typography
                            component="a"
                            href={sa.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            variant="caption"
                            sx={{ color: '#1565C0', textDecoration: 'underline' }}
                          >
                            {sa.postUrl}
                          </Typography>
                        </Stack>
                      )}
                      {sa.errorMessage && (
                        <Box mt={1} sx={{ bgcolor: '#FDE2E2', border: '1px solid #F5C2C2', borderRadius: 1.5, p: 1 }}>
                          <Typography variant="caption" sx={{ color: '#B71C1C' }}>
                            {sa.errorMessage}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Historial de estados
            </Typography>
            <Box sx={{ position: 'relative', pl: 2.5 }}>
              <Box sx={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 1, borderLeft: '1px solid #E8E8E8' }} />
              {history.map((item, i) => (
                <Box key={i} sx={{ position: 'relative', mb: 2.5 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -18,
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: item.color,
                    }}
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ color: item.color }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.date} · {item.actor} ({item.role})
                  </Typography>
                  {item.comment && (
                    <Box
                      mt={0.75}
                      sx={{ bgcolor: `${item.color}1A`, border: `1px solid ${item.color}30`, borderRadius: 1.5, p: 1.5 }}
                    >
                      <Typography variant="caption" sx={{ color: item.color }}>
                        {item.comment}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Vista previa
            </Typography>
            <Box
              sx={{
                bgcolor: '#1A1A1A',
                borderRadius: 2,
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#666' }}>
                {networkLabel !== '—' ? `Vista previa · ${networkLabel}` : 'Sin red asignada'}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              {post.content}
            </Typography>
            <Stack direction="row" gap={0.5} mt={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {brand}
              </Typography>
              <Typography variant="caption" fontWeight={500}>
                {primaryAccount ? primaryAccount.socialAccountId : ''}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={networkShort}
              sx={{ bgcolor: networkBg, color: networkColor, fontWeight: 600, mt: 1 }}
            />
          </Paper>
        </Grid>
      </Grid>

      <RejectPostDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleConfirmReject} />
    </Box>
  );
}
