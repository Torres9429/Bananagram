'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { PrimaryButton, useToast } from '@repo/ui/ui';
import { useListSocialNetworksQuery } from '@repo/ui/state';
import { POST_CHAR_LIMIT, NETWORK_DISPLAY_COLORS, NETWORK_SHORT_LABELS } from '../../../lib/mock-data';
import { useListCampaignsQuery } from '../../../store/api/campaigns.api';
import { useCreatePostMutation, useUploadMediaMutation, useSubmitForReviewMutation } from '../../../store/api/posts.api';

// Reescrita a datos reales (Fase N). Cambios de fondo respecto al mock:
// - Ya no hay "biblioteca de media" reutilizable (no existe ese concepto en
//   el backend real) — se adjuntan archivos nuevos desde el dispositivo,
//   subidos recién después de crear el post (POST /posts/:id/media exige
//   que el post ya exista).
// - Se quitó el panel de IA (sugerencias/engagement estimado): inventado,
//   sin ninguna integración real detrás.
// - Redes = catálogo real (catalogsApi), no las cuentas conectadas de la
//   marca — la validación de "¿está conectada de verdad?" ya la hace el
//   backend al programar (schedulePost), no hace falta duplicarla aquí.
export default function NewPostPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [campaignId, setCampaignId] = useState('');
  const [socialNetworkIds, setSocialNetworkIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: campaigns = [] } = useListCampaignsQuery();
  const { data: socialNetworks = [] } = useListSocialNetworksQuery();
  const [createPost] = useCreatePostMutation();
  const [uploadMedia] = useUploadMediaMutation();
  const [submitForReview] = useSubmitForReviewMutation();

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const selectedNetworks = socialNetworks.filter((n) => socialNetworkIds.includes(n.id));

  const limit = POST_CHAR_LIMIT;
  const charCount = content.length;
  const nearLimit = charCount > limit * 0.9;
  const hashtags = content.match(/#\S+/g) ?? [];
  const previewText = content.length > 140 ? `${content.slice(0, 140)}...` : content;
  const filePreviews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));

  function toggleSocialNetwork(id: string) {
    setSocialNetworkIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(submitAfter: boolean) {
    if (!selectedCampaign || !content.trim() || socialNetworkIds.length === 0) return;
    setSubmitting(true);
    try {
      const post = await createPost({
        brandId: selectedCampaign.brandId,
        campaignId: selectedCampaign.id,
        socialNetworkIds,
        content: content.trim(),
        instructions: instructions.trim() || undefined,
      }).unwrap();

      if (files.length > 0) {
        try {
          await uploadMedia({ id: post.id, files }).unwrap();
        } catch {
          showError('El post se creó, pero no se pudieron adjuntar los archivos.');
        }
      }

      if (submitAfter) {
        // Solo el CM asignado a la campaña puede enviar a revisión — si
        // quien crea es un Diseñador, el post igual queda guardado como
        // borrador (avisamos en vez de fallar en silencio).
        try {
          await submitForReview(post.id).unwrap();
          showSuccess('Publicación creada y enviada a revisión.');
        } catch {
          showSuccess('Publicación guardada como borrador — solo el CM asignado puede enviarla a revisión.');
        }
      } else {
        showSuccess('Publicación guardada como borrador.');
      }
      router.push(`/posts/${post.id}`);
    } catch {
      showError('No se pudo crear la publicación.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Tooltip title="Volver">
        <IconButton
          onClick={() => router.back()}
          sx={{ mb: 2, color: 'secondary.main', bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFF8E1' } }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Campaña</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={campaignId}
              onChange={(e: SelectChangeEvent) => setCampaignId(e.target.value)}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              <MenuItem value=""><em>Selecciona una campaña</em></MenuItem>
              {campaigns.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>

            <Typography variant="subtitle2" color="text.secondary" mb={1}>Redes de publicación</Typography>
            {socialNetworks.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                No hay redes sociales en el catálogo todavía.
              </Alert>
            ) : (
              <Stack direction="row" gap={1} flexWrap="wrap" mb={2.5}>
                {socialNetworks.map((n) => {
                  const active = socialNetworkIds.includes(n.id);
                  return (
                    <Chip
                      key={n.id}
                      label={n.name}
                      onClick={() => toggleSocialNetwork(n.id)}
                      sx={{
                        cursor: 'pointer',
                        height: 32,
                        border: `1px solid ${active ? '#E0A800' : '#E8E8E8'}`,
                        bgcolor: active ? '#FFF8E1' : 'transparent',
                        color: active ? 'primary.contrastTextMuted' : '#1A1A1A',
                        fontWeight: 600,
                      }}
                    />
                  );
                })}
              </Stack>
            )}

            <Typography variant="subtitle2" color="text.secondary" mb={1}>Contenido</Typography>
            <TextField
              multiline
              minRows={5}
              fullWidth
              placeholder="Escribe el copy para las redes seleccionadas…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5} mb={2}>
              <Typography variant="caption" color="text.secondary">
                Límite de caracteres: {limit.toLocaleString()} (mismo límite para todas las redes)
              </Typography>
              <Typography variant="caption" sx={{ color: nearLimit ? '#C62828' : '#6B6B6B', fontWeight: nearLimit ? 700 : 400 }}>
                {charCount.toLocaleString()} / {limit.toLocaleString()}
              </Typography>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" mb={1}>Instrucciones internas (opcional)</Typography>
            <TextField
              multiline
              minRows={2}
              fullWidth
              placeholder="Notas para el equipo, no se publican…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" mb={filePreviews.length > 0 ? 1 : 2}>
              <Button component="label" startIcon={<AttachFileIcon fontSize="small" />} sx={{ color: 'secondary.main' }}>
                Adjuntar archivos
                <input type="file" hidden multiple accept="image/*,video/*" onChange={handleFilesSelected} />
              </Button>
              {filePreviews.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {filePreviews.length} {filePreviews.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
                </Typography>
              )}
            </Stack>

            {filePreviews.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
                {filePreviews.map((f, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 64, height: 64 }}>
                    {f.file.type.startsWith('image') ? (
                      <Box component="img" src={f.url} alt={f.file.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid #E8E8E8', display: 'block' }} />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', borderRadius: 1.5, border: '1px solid #E8E8E8', bgcolor: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Chip label="Video" size="small" sx={{ fontSize: 10 }} />
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeFile(i)}
                      sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, bgcolor: '#fff', border: '1px solid #E8E8E8', '&:hover': { bgcolor: '#FFEBEE' } }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}

            {nearLimit && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Estás cerca del límite de caracteres.
              </Alert>
            )}

            <Divider sx={{ mb: 2 }} />

            <Stack direction="row" gap={1.5}>
              <Button
                variant="outlined"
                disabled={submitting || !selectedCampaign || !content.trim() || socialNetworkIds.length === 0}
                sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
                onClick={() => handleCreate(false)}
              >
                Guardar borrador
              </Button>
              <PrimaryButton
                disabled={submitting || !selectedCampaign || !content.trim() || socialNetworkIds.length === 0}
                onClick={() => handleCreate(true)}
              >
                Crear y enviar a revisión →
              </PrimaryButton>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, position: 'sticky', top: 24 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Vista previa {selectedNetworks.length > 0 && `(${selectedNetworks.length} ${selectedNetworks.length === 1 ? 'red' : 'redes'})`}
            </Typography>
            {selectedNetworks.length === 0 ? (
              <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selecciona al menos una red para ver la vista previa.
                </Typography>
              </Box>
            ) : (
              <Stack gap={2}>
                {selectedNetworks.map((n) => {
                  const colors = NETWORK_DISPLAY_COLORS[n.code];
                  const previewImage = filePreviews.find((f) => f.file.type.startsWith('image'));
                  return (
                    <Box key={n.id} sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                      <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                        <Avatar sx={{ bgcolor: colors.bg, color: colors.color, width: 32, height: 32, fontSize: 11, fontWeight: 600 }}>
                          {NETWORK_SHORT_LABELS[n.code]}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{n.name}</Typography>
                      </Stack>
                      <Box sx={{ bgcolor: '#E0E0E0', borderRadius: 1.5, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, overflow: 'hidden' }}>
                        {previewImage ? (
                          <Box component="img" src={previewImage.url} alt={previewImage.file.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#9E9E9E' }}>Sin imagen adjunta</Typography>
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, mb: 1 }}>
                        {previewText || <span style={{ color: '#9E9E9E' }}>El copy aparecerá aquí…</span>}
                      </Typography>
                      <Stack direction="row" gap={0.75} mt={0.5} flexWrap="wrap">
                        {hashtags.map((tag, i) => (
                          <Chip key={i} size="small" label={tag} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontSize: 10, height: 20 }} />
                        ))}
                      </Stack>
                      <Chip size="small" label="BORRADOR" sx={{ bgcolor: '#F5F5F5', color: '#616161', fontWeight: 600, mt: 1.5 }} />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
