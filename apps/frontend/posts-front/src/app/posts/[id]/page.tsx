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
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { StatusChip, PrimaryButton, useToast, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { ZONE_URLS } from '@repo/ui/config';
import type { PostSocialAccountStatus } from '@repo/ui/types';
import {
  useGetPostQuery,
  useSubmitForReviewMutation,
  useApprovePostMutation,
  useRejectPostMutation,
  useClientRejectPostMutation,
  useForwardToDesignerMutation,
  useUpdatePostMutation,
  useSchedulePostMutation,
  useCancelPostMutation,
  useUploadMediaMutation,
  useRemoveMediaMutation,
} from '../../../store/api/posts.api';
import { NETWORK_DISPLAY_COLORS, NETWORK_LABELS, NETWORK_SHORT_LABELS } from '../../../lib/mock-data';
import { RejectPostDialog } from '../../../components/RejectPostDialog';
import { MediaCarousel } from '../../../components/MediaCarousel';

const PSA_STATUS_STYLES: Record<PostSocialAccountStatus, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#F5F5F5', color: '#616161', label: 'Pendiente' },
  publicando: { bg: '#E1F5FE', color: '#0277BD', label: 'Publicando' },
  publicado: { bg: '#E8F5E9', color: '#2E7D32', label: 'Publicado' },
  error: { bg: '#FDE2E2', color: '#B71C1C', label: 'Error' },
  cancelado: { bg: '#EEEEEE', color: '#757575', label: 'Cancelado' },
};

const STATUS_HISTORY_STYLES: Record<string, string> = {
  borrador: '#757575',
  en_revision: '#0277BD',
  aprobado: '#2E7D32',
  rechazado: '#C62828',
  rechazado_cliente: '#C62828',
  programado: '#E65100',
  publicando: '#0277BD',
  publicado: '#2E7D32',
  parcial: '#E65100',
  error: '#B71C1C',
  cancelado: '#757575',
};

const HISTORY_PREVIEW_COUNT = 3;

const FILTER_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  en_revision: 'Enviado a revisión',
  aprobado: 'Aprobado por el CM',
  rechazado: 'Rechazado por el CM',
  rechazado_cliente: 'Rechazado por el Cliente',
  programado: 'Programado',
  publicando: 'Publicando',
  publicado: 'Publicado',
  parcial: 'Parcial',
  error: 'Error',
  cancelado: 'Cancelado',
};

// Reescrita a datos reales (Fase N), acciones reales de 2 tramos (Fase O):
// Diseñador crea/edita → CM aprueba/rechaza → Cliente programa/rechaza → CM
// edita-y-reenvía o regresa al Diseñador. Se quitó el panel de "análisis IA"
// (era enteramente inventado, sin integración real detrás).
export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useSelector(selectUser);
  const { showSuccess, showError } = useToast();
  const { can } = usePermissions();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [cmComment, setCmComment] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const { data: post, isFetching } = useGetPostQuery(params.id);
  const [submitForReview, { isLoading: isSubmitting }] = useSubmitForReviewMutation();
  const [approvePost, { isLoading: isApproving }] = useApprovePostMutation();
  const [rejectPost] = useRejectPostMutation();
  const [clientRejectPost] = useClientRejectPostMutation();
  const [forwardToDesigner, { isLoading: isForwarding }] = useForwardToDesignerMutation();
  const [updatePost, { isLoading: isSaving }] = useUpdatePostMutation();
  const [schedulePost, { isLoading: isScheduling }] = useSchedulePostMutation();
  const [cancelPost, { isLoading: isCancelling }] = useCancelPostMutation();
  const [uploadMedia, { isLoading: isUploadingMedia }] = useUploadMediaMutation();
  const [removeMedia] = useRemoveMediaMutation();

  if (isFetching) return null;
  if (!post) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">Esta publicación no existe o no tienes acceso a ella.</Typography>
      </Box>
    );
  }

  const isCm = !!user && post.campaign.cmId === user.id;
  const isClient = !!user && post.brand.ownerId === user.id;
  const isDesignerOrCreator =
    !!user && (post.createdBy === user.id || post.campaign.designers.some((d) => d.userId === user.id));
  const canEditNow =
    (post.status === 'borrador' || post.status === 'rechazado') && (isCm || isClient || isDesignerOrCreator);
  const canEditRechazadoCliente = post.status === 'rechazado_cliente' && isCm;

  // Historial más reciente primero, colapsado por defecto (ver más/ver menos).
  const historyDesc = [...post.statusHistory].reverse();
  const visibleHistory = historyExpanded ? historyDesc : historyDesc.slice(0, HISTORY_PREVIEW_COUNT);

  // El motivo del Cliente SIEMPRE se muestra cuando el post llegó por la vía
  // "el CM lo regresó al Diseñador" — se busca en el historial, no depende
  // de que exista un comentario adicional del CM.
  const forwardedHistoryEntry = post.status === 'borrador'
    ? [...post.statusHistory].reverse().find((h) => h.fromStatus === 'rechazado_cliente' && h.toStatus === 'borrador')
    : undefined;
  const clientRejectionEntry = forwardedHistoryEntry
    ? [...post.statusHistory].reverse().find((h) => h.toStatus === 'rechazado_cliente')
    : undefined;

  const hasDelivery = post.socialAccounts.length > 0;
  const carouselItems = post.media.map((pm) => ({
    url: pm.media.url,
    type: pm.media.mimeType.startsWith('video') ? ('video' as const) : ('image' as const),
    alt: pm.media.originalName,
  }));

  function startEditing() {
    setEditContent(post!.content);
    setEditInstructions(post!.instructions ?? '');
    setEditFiles([]);
    setEditing(true);
  }

  function handleEditFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setEditFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  }

  function removeEditFile(index: number) {
    setEditFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleRemoveExistingMedia(mediaId: string) {
    try {
      await removeMedia({ id: post!.id, mediaId }).unwrap();
    } catch {
      showError('No se pudo quitar el archivo.');
    }
  }

  async function handleSaveEdit(resendAfter: boolean) {
    try {
      await updatePost({ id: post!.id, content: editContent.trim(), instructions: editInstructions.trim() || undefined }).unwrap();
      if (editFiles.length > 0) {
        try {
          await uploadMedia({ id: post!.id, files: editFiles }).unwrap();
          setEditFiles([]);
        } catch {
          showError('El contenido se guardó, pero no se pudieron adjuntar los archivos nuevos — intenta de nuevo.');
          return;
        }
      }
      if (resendAfter) {
        await approvePost(post!.id).unwrap();
        showSuccess('Publicación editada y reenviada al cliente.');
      } else {
        showSuccess('Publicación actualizada.');
      }
      setEditing(false);
    } catch {
      showError('No se pudo guardar la edición.');
    }
  }

  async function handleSubmitForReview() {
    try {
      await submitForReview(post!.id).unwrap();
      showSuccess('Publicación enviada a revisión.');
    } catch {
      showError('No se pudo enviar a revisión.');
    }
  }

  async function handleApprove() {
    try {
      await approvePost(post!.id).unwrap();
      showSuccess('Publicación aprobada — pasó al Cliente.');
    } catch {
      showError('No se pudo aprobar la publicación.');
    }
  }

  async function handleConfirmReject(reason: string) {
    try {
      if (isCm) {
        await rejectPost({ id: post!.id, comment: reason }).unwrap();
        showSuccess('Publicación rechazada — regresó al Diseñador.');
      } else {
        await clientRejectPost({ id: post!.id, comment: reason }).unwrap();
        showSuccess('Publicación rechazada — regresó al CM.');
      }
    } catch {
      showError('No se pudo rechazar la publicación.');
    } finally {
      setRejectOpen(false);
    }
  }

  async function handleForwardToDesigner() {
    try {
      await forwardToDesigner({ id: post!.id, comment: cmComment.trim() || undefined }).unwrap();
      showSuccess('Publicación regresada al Diseñador.');
      setCmComment('');
    } catch {
      showError('No se pudo regresar la publicación al Diseñador.');
    }
  }

  async function handleSchedule() {
    try {
      await schedulePost({ id: post!.id, scheduledAt: scheduledAt || undefined }).unwrap();
      showSuccess('Publicación programada.');
    } catch {
      showError('No se pudo programar — confirma que todas las redes elegidas estén conectadas.');
    }
  }

  async function handleCancel() {
    try {
      await cancelPost(post!.id).unwrap();
      showSuccess('Publicación cancelada.');
    } catch {
      showError('No se pudo cancelar la publicación.');
    }
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
                {post.content.split('\n')[0].slice(0, 60) || 'Sin contenido'}
              </Typography>
              <StatusChip status={post.status} />
            </Stack>
            <Divider sx={{ mb: 2 }} />

            {/* El motivo del Cliente siempre se muestra cuando el post llegó
                por "el CM lo regresó" — no depende de que el CM haya agregado
                un comentario propio. */}
            {forwardedHistoryEntry && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={600}>El cliente rechazó esta publicación:</Typography>
                <Typography variant="body2">"{clientRejectionEntry?.comment ?? 'sin detalle'}"</Typography>
                {forwardedHistoryEntry.comment && (
                  <>
                    <Typography variant="body2" fontWeight={600} mt={1}>Nota del CM:</Typography>
                    <Typography variant="body2">"{forwardedHistoryEntry.comment}"</Typography>
                  </>
                )}
              </Alert>
            )}

            <Stack gap={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Redes</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {post.socialNetworks.length === 0
                    ? 'Sin redes asignadas'
                    : post.socialNetworks.length === 1
                      ? NETWORK_LABELS[post.socialNetworks[0].socialNetwork.code]
                      : `${post.socialNetworks.length} redes (ver detalle abajo)`}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Campaña</Typography>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ color: '#1565C0', cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                  onClick={() => { window.location.href = `${ZONE_URLS.brandsFront}/brands/${post.brandId}/campaigns/${post.campaignId}`; }}
                >
                  {post.campaign.name}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Creado el</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {new Date(post.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Stack>
              {post.scheduledAt && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Programado para</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {new Date(post.scheduledAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {editing ? (
              <Stack gap={1.5}>
                <TextField
                  multiline
                  minRows={5}
                  fullWidth
                  label="Contenido"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <TextField
                  multiline
                  minRows={2}
                  fullWidth
                  label="Instrucciones internas (opcional)"
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                />

                {/* Solo borrador/rechazado permiten tocar media en el
                    backend (attachMediaToPost/removeMediaFromPost) —
                    rechazado_cliente (canEditRechazadoCliente) no. */}
                {canEditNow && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>Imágenes/videos adjuntos</Typography>
                    <Stack direction="row" gap={1} flexWrap="wrap" mb={1}>
                      {post.media.map((pm) => (
                        <Box key={pm.mediaId} sx={{ position: 'relative', width: 64, height: 64 }}>
                          <Box component="img" src={pm.media.url} alt={pm.media.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid #E8E8E8', display: 'block' }} />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveExistingMedia(pm.mediaId)}
                            sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFEBEE' } }}
                          >
                            <CloseIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Box>
                      ))}
                      {editFiles.map((f, i) => (
                        <Box key={`new-${i}`} sx={{ position: 'relative', width: 64, height: 64 }}>
                          <Box component="img" src={URL.createObjectURL(f)} alt={f.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid #E0A800', display: 'block' }} />
                          <IconButton
                            size="small"
                            onClick={() => removeEditFile(i)}
                            sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFEBEE' } }}
                          >
                            <CloseIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Stack>
                    <Button component="label" size="small" startIcon={<AttachFileIcon fontSize="small" />} sx={{ color: 'secondary.main' }}>
                      Adjuntar archivos
                      <input type="file" hidden multiple accept="image/*,video/*" onChange={handleEditFilesSelected} />
                    </Button>
                  </Box>
                )}

                <Stack direction="row" gap={1.5}>
                  <Button variant="outlined" onClick={() => setEditing(false)} sx={{ color: '#6B6B6B', borderColor: '#E8E8E8' }}>
                    Cancelar
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={isSaving || isUploadingMedia || !editContent.trim()}
                    onClick={() => handleSaveEdit(false)}
                    sx={{ borderColor: '#E0A800', color: 'secondary.main' }}
                  >
                    {isUploadingMedia ? 'Subiendo archivos…' : 'Guardar'}
                  </Button>
                  {canEditRechazadoCliente && (
                    <PrimaryButton disabled={isSaving || isApproving || isUploadingMedia || !editContent.trim()} onClick={() => handleSaveEdit(true)}>
                      Guardar y reenviar al Cliente →
                    </PrimaryButton>
                  )}
                </Stack>
              </Stack>
            ) : (
              <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </Typography>
              </Box>
            )}

            {post.status === 'aprobado' && isClient && (
              <TextField
                type="datetime-local"
                size="small"
                label="Programar para (opcional, vacío = ahora)"
                InputLabelProps={{ shrink: true }}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                sx={{ mt: 2, mb: 1, minWidth: 260 }}
              />
            )}

            {canEditRechazadoCliente && !editing && (
              <TextField
                multiline
                minRows={2}
                fullWidth
                size="small"
                label="Nota para el Diseñador (opcional)"
                value={cmComment}
                onChange={(e) => setCmComment(e.target.value)}
                sx={{ mt: 2 }}
              />
            )}

            {!editing && (
              <Stack direction="row" gap={1.5} mt={2} flexWrap="wrap">
                {canEditNow && (
                  <Button variant="outlined" onClick={startEditing} sx={{ borderColor: '#E0A800', color: 'secondary.main' }}>
                    Editar
                  </Button>
                )}
                {(post.status === 'borrador' || post.status === 'rechazado') && (isCm || isClient || isDesignerOrCreator) && (
                  <PrimaryButton disabled={isSubmitting} onClick={handleSubmitForReview}>
                    {isSubmitting ? 'Enviando…' : 'Enviar a revisión →'}
                  </PrimaryButton>
                )}
                {post.status === 'en_revision' && isCm && (
                  <>
                    {can('publicaciones', 'rechazar') && (
                      <Button variant="outlined" onClick={() => setRejectOpen(true)} sx={{ color: '#C62828', borderColor: '#C62828' }}>
                        Rechazar
                      </Button>
                    )}
                    {can('publicaciones', 'aprobar') && (
                      <Button variant="contained" disabled={isApproving} onClick={handleApprove} sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>
                        {isApproving ? 'Aprobando…' : 'Aprobar'}
                      </Button>
                    )}
                  </>
                )}
                {post.status === 'aprobado' && isClient && (
                  <>
                    {can('publicaciones', 'rechazar') && (
                      <Button variant="outlined" onClick={() => setRejectOpen(true)} sx={{ color: '#C62828', borderColor: '#C62828' }}>
                        Rechazar
                      </Button>
                    )}
                    <Button variant="contained" disabled={isScheduling} onClick={handleSchedule} sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}>
                      {isScheduling ? 'Programando…' : 'Programar / Publicar ahora'}
                    </Button>
                  </>
                )}
                {canEditRechazadoCliente && (
                  <Button variant="outlined" disabled={isForwarding} onClick={handleForwardToDesigner} sx={{ color: '#C62828', borderColor: '#C62828' }}>
                    {isForwarding ? 'Regresando…' : 'Regresar a Diseñador'}
                  </Button>
                )}
                {post.status === 'programado' && (isCm || isClient) && (
                  <Button variant="outlined" disabled={isCancelling} onClick={handleCancel} sx={{ color: '#C62828', borderColor: '#C62828' }}>
                    {isCancelling ? 'Cancelando…' : 'Cancelar programación'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
                  onClick={() => { window.location.href = `${ZONE_URLS.brandsFront}/brands/${post.brandId}/campaigns/${post.campaignId}`; }}
                >
                  Ver campaña →
                </Button>
              </Stack>
            )}
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Estado por red
            </Typography>
            {!hasDelivery ? (
              <Stack gap={1}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Todavía no se envió a publicar — redes solicitadas:
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {post.socialNetworks.map((sn) => {
                    const colors = NETWORK_DISPLAY_COLORS[sn.socialNetwork.code];
                    return (
                      <Chip
                        key={sn.socialNetworkId}
                        label={NETWORK_LABELS[sn.socialNetwork.code]}
                        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 600 }}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            ) : (
              <Stack gap={1.5}>
                {post.socialAccounts.map((sa) => {
                  const code = sa.socialAccount.socialNetwork.code;
                  const colors = NETWORK_DISPLAY_COLORS[code];
                  const style = PSA_STATUS_STYLES[sa.status];
                  return (
                    <Box key={sa.id} sx={{ border: '1px solid #E8E8E8', borderRadius: 2, p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Stack direction="row" gap={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: colors.bg, color: colors.color, fontSize: 11, fontWeight: 600 }}>
                            {NETWORK_SHORT_LABELS[code]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{NETWORK_LABELS[code]}</Typography>
                            <Typography variant="caption" color="text.secondary">{sa.socialAccount.handle}</Typography>
                          </Box>
                        </Stack>
                        <Chip size="small" label={style.label} sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: 10 }} />
                      </Stack>
                      {sa.postUrl && (
                        <Stack direction="row" gap={0.5} alignItems="center" mt={1}>
                          <OpenInNewIcon sx={{ fontSize: 14, color: '#1565C0' }} />
                          <Typography component="a" href={sa.postUrl} target="_blank" rel="noreferrer" variant="caption" sx={{ color: '#1565C0', textDecoration: 'underline' }}>
                            {sa.postUrl}
                          </Typography>
                        </Stack>
                      )}
                      {sa.errorMessage && (
                        <Box mt={1} sx={{ bgcolor: '#FDE2E2', border: '1px solid #F5C2C2', borderRadius: 1.5, p: 1 }}>
                          <Typography variant="caption" sx={{ color: '#B71C1C' }}>{sa.errorMessage}</Typography>
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
            {post.statusHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin cambios de estado todavía.</Typography>
            ) : (
              <>
                <Box sx={{ position: 'relative', pl: 2.5 }}>
                  <Box sx={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 1, borderLeft: '1px solid #E8E8E8' }} />
                  {visibleHistory.map((item) => {
                    const color = STATUS_HISTORY_STYLES[item.toStatus] ?? '#757575';
                    return (
                      <Box key={item.id} sx={{ position: 'relative', mb: 2.5 }}>
                        <Box sx={{ position: 'absolute', left: -18, top: 4, width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                        <Typography variant="body2" fontWeight={600} sx={{ color }}>
                          {FILTER_LABELS[item.toStatus] ?? item.toStatus}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {item.comment && (
                          <Box mt={0.75} sx={{ bgcolor: `${color}1A`, border: `1px solid ${color}30`, borderRadius: 1.5, p: 1.5 }}>
                            <Typography variant="caption" sx={{ color }}>{item.comment}</Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
                {historyDesc.length > HISTORY_PREVIEW_COUNT && (
                  <Button size="small" onClick={() => setHistoryExpanded((v) => !v)} sx={{ color: 'secondary.main' }}>
                    {historyExpanded ? 'Ver menos' : `Ver más (${historyDesc.length - HISTORY_PREVIEW_COUNT})`}
                  </Button>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, position: 'sticky', top: 24 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Vista previa {post.socialNetworks.length > 0 && `(${post.socialNetworks.length} ${post.socialNetworks.length === 1 ? 'red' : 'redes'})`}
            </Typography>
            {post.socialNetworks.length === 0 ? (
              <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary">Sin red asignada.</Typography>
              </Box>
            ) : (
              <Stack gap={2}>
                {post.socialNetworks.map((sn) => {
                  const code = sn.socialNetwork.code;
                  const colors = NETWORK_DISPLAY_COLORS[code];
                  return (
                    <Box key={sn.socialNetworkId} sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                      <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                        <Avatar sx={{ bgcolor: colors.bg, color: colors.color, width: 32, height: 32, fontSize: 11, fontWeight: 600 }}>
                          {NETWORK_SHORT_LABELS[code]}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{NETWORK_LABELS[code]}</Typography>
                      </Stack>
                      <Box sx={{ mb: 1.5 }}>
                        <MediaCarousel items={carouselItems} />
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {post.content || <span style={{ color: '#9E9E9E' }}>Sin contenido</span>}
                      </Typography>
                      <StatusChip status={post.status} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <RejectPostDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleConfirmReject} />
    </Box>
  );
}
