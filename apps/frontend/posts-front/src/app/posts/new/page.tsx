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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { PrimaryButton } from '@repo/ui/ui';
import {
  POST_CHAR_LIMIT,
  MOCK_CAMPAIGNS,
  NETWORK_LABELS,
  MOCK_AI_SUGGESTIONS,
  MOCK_TIME_SLOTS,
  MOCK_MEDIA_LIBRARY,
  getSocialAccountsForCampaign,
  getPostNetworkInfo,
  getMedia,
  getMediaLibraryByBrand,
  getBrand,
} from '../../../lib/mock-data';
import type { SocialAccount } from '../../../interfaces/interface';

export default function NewPostPage() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState('c1');
  // Multi-select: un post puede publicarse en varias redes a la vez (fan-out
  // multi-red, ver docs/frontend-db-alignment.md §1.1 y decisión §5/§9). Antes
  // era un único brandProfileId con selección exclusiva.
  const [socialAccountIds, setSocialAccountIds] = useState<string[]>(() =>
    getSocialAccountsForCampaign('c1').map((p) => p.id),
  );
  const [content, setContent] = useState('');
  const [datetime, setDatetime] = useState('');
  // Media adjunta (PostMedia) — orden = orden de selección, se usa al
  // construir el post (ver buildMediaPayload). Sin backend real, es mock.
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const profiles: SocialAccount[] = getSocialAccountsForCampaign(campaignId);
  const selectedAccounts = profiles.filter((p) => socialAccountIds.includes(p.id));
  const selectedMedia = selectedMediaIds.map((id) => getMedia(id)).filter((m): m is NonNullable<typeof m> => !!m);

  // Biblioteca del picker: filtrada por la marca de la campaña activa (si
  // hay una seleccionada) — no tiene sentido ofrecer archivos de otra marca.
  const currentCampaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  const mediaLibrary = currentCampaign ? getMediaLibraryByBrand(currentCampaign.brandId) : MOCK_MEDIA_LIBRARY;

  // Límite de caracteres único, sin importar cuántas ni cuáles redes estén
  // seleccionadas (decisión de producto — no se toma el mínimo entre redes).
  const limit = POST_CHAR_LIMIT;
  const charCount = content.length;
  const nearLimit = charCount > limit * 0.9;
  const hashtags = content.match(/#\S+/g) ?? [];
  const previewText = content.length > 140 ? `${content.slice(0, 140)}...` : content;

  function toggleSocialAccount(id: string) {
    setSocialAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleMedia(id: string) {
    setSelectedMediaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function buildMediaPayload() {
    // order = orden de selección (mock, sin persistencia real).
    return selectedMediaIds.map((mediaId, order) => ({ mediaId, order }));
  }

  function handleCampaignChange(e: SelectChangeEvent) {
    const newCampaignId = e.target.value;
    setCampaignId(newCampaignId);
    // Reseteamos a las cuentas disponibles de la nueva campaña — no dejamos
    // ids de la campaña anterior colgando en la selección.
    const newProfiles = getSocialAccountsForCampaign(newCampaignId);
    setSocialAccountIds(newProfiles.map((p) => p.id));
  }

  function buildSocialAccountsPayload() {
    // Al enviar, cada red seleccionada arranca en 'pendiente' — recién se
    // publicará después (sigue sin persistir de verdad, es mock).
    return socialAccountIds.map((id, i) => ({
      id: `psa-new-${i}`,
      socialAccountId: id,
      status: 'pendiente' as const,
    }));
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
        {/* Columna izquierda — formulario */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            {/* Campaña */}
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Campaña</Typography>
            <Select
              fullWidth
              size="small"
              value={campaignId}
              onChange={handleCampaignChange}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {MOCK_CAMPAIGNS.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getBrand(c.brandId)?.primaryColor ?? '#6B6B6B', flexShrink: 0 }} />
                    {c.name} — {getBrand(c.brandId)?.name ?? '—'}
                  </Stack>
                </MenuItem>
              ))}
              <MenuItem value="none"><em>Sin campaña</em></MenuItem>
            </Select>

            {/* SocialAccounts (redes de la marca) — multi-select por toggle */}
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Redes de publicación</Typography>
            {profiles.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                Esta campaña no tiene perfiles de red social configurados aún.
              </Alert>
            ) : (
              <Stack direction="row" gap={1} flexWrap="wrap" mb={2.5}>
                {profiles.map((p) => {
                  const active = socialAccountIds.includes(p.id);
                  const { network } = getPostNetworkInfo(p.id);
                  return (
                    <Chip
                      key={p.id}
                      label={
                        <Stack direction="row" gap={0.5} alignItems="center">
                          <Typography variant="caption" fontWeight={700}>
                            {NETWORK_LABELS[network as keyof typeof NETWORK_LABELS] ?? network}
                          </Typography>
                          <Typography variant="caption" color="inherit" sx={{ opacity: 0.75 }}>{p.handle}</Typography>
                        </Stack>
                      }
                      onClick={() => toggleSocialAccount(p.id)}
                      sx={{
                        cursor: 'pointer',
                        height: 32,
                        border: `1px solid ${active ? '#E0A800' : '#E8E8E8'}`,
                        bgcolor: active ? '#FFF8E1' : 'transparent',
                        color: active ? 'primary.contrastTextMuted' : '#1A1A1A',
                      }}
                    />
                  );
                })}
              </Stack>
            )}

            {/* Contenido */}
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

            {/* Media adjunta (Media/PostMedia) — picker mock sobre la
                biblioteca de la marca de la campaña activa. */}
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" mb={selectedMedia.length > 0 ? 1 : 2}>
              <Chip
                icon={<AttachFileIcon fontSize="small" />}
                label="Adjuntar media"
                onClick={() => setMediaPickerOpen(true)}
                sx={{ cursor: 'pointer', bgcolor: '#F7F7F7', border: '1px solid #E8E8E8', fontWeight: 600 }}
              />
              {selectedMedia.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {selectedMedia.length} {selectedMedia.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
                </Typography>
              )}
            </Stack>

            {selectedMedia.length > 0 && (
              <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
                {selectedMedia.map((m) => (
                  <Box key={m.id} sx={{ position: 'relative', width: 64, height: 64 }}>
                    <Box
                      component="img"
                      src={m.url}
                      alt={m.originalName}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1.5, border: '1px solid #E8E8E8', display: 'block' }}
                    />
                    {m.mimeType.startsWith('video') && (
                      <Chip
                        label="Video"
                        size="small"
                        sx={{ position: 'absolute', bottom: 2, left: 2, height: 16, fontSize: 8, bgcolor: 'rgba(0,0,0,0.65)', color: '#fff' }}
                      />
                    )}
                    <IconButton
                      size="small"
                      onClick={() => toggleMedia(m.id)}
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

            {/* Fecha de publicación */}
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Fecha y hora de publicación (opcional)
            </Typography>
            <TextField
              type="datetime-local"
              fullWidth
              size="small"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Divider sx={{ mb: 2 }} />

            {/* Panel IA mock */}
            <Box sx={{ border: '1.5px solid #E0A800', borderRadius: 2, bgcolor: '#FFFDE7', p: 2, mb: 3 }}>
              <Chip label="IA · Análisis pre-publicación" size="small" sx={{ bgcolor: '#E0A800', color: 'primary.contrastTextMuted', fontWeight: 700, mb: 1.5 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Engagement estimado</Typography>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#2E7D32' }}>4.2%</Typography>
                    <Chip size="small" label="Alto" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    vs benchmark de las redes seleccionadas 3.5%
                  </Typography>
                </Box>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#E0A800', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography fontWeight={700} sx={{ color: 'primary.contrastTextMuted' }}>84</Typography>
                  <Typography variant="caption" sx={{ color: 'primary.contrastTextMuted', fontSize: 9 }}>Score</Typography>
                </Box>
              </Stack>
              <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">Sugerencias</Typography>
              <Stack gap={0.5}>
                {MOCK_AI_SUGGESTIONS.map((s, i) => (
                  <Stack key={i} direction="row" gap={1} alignItems="flex-start" sx={{ py: 0.75, borderBottom: i < MOCK_AI_SUGGESTIONS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <Typography fontWeight={700} sx={{ color: '#D4AC40' }}>{i + 1}.</Typography>
                    <Typography variant="caption">{s}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                {MOCK_TIME_SLOTS.map((slot) => (
                  <Chip key={slot} label={slot} onClick={() => {}} sx={{ cursor: 'pointer', bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', border: '1px solid #D4AC40' }} />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary" fontStyle="italic" mt={1} display="block" fontSize={10}>
                Análisis orientativo generado por IA. Los resultados reales pueden variar.
              </Typography>
            </Box>

            <Stack direction="row" gap={1.5}>
              <Button
                variant="outlined"
                sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }}
                onClick={() => {
                  // Mock: sin persistencia real — solo navega, mismo comportamiento de antes.
                  buildSocialAccountsPayload();
                  buildMediaPayload();
                  router.push('/posts');
                }}
              >
                Guardar borrador
              </Button>
              <PrimaryButton
                disabled={!content.trim() || socialAccountIds.length === 0}
                onClick={() => {
                  buildSocialAccountsPayload();
                  buildMediaPayload();
                  router.push('/posts/approvals');
                }}
              >
                Enviar a revisión →
              </PrimaryButton>
            </Stack>
          </Paper>
        </Grid>

        {/* Columna derecha — vista previa: una card por cada red seleccionada */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, position: 'sticky', top: 24 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Vista previa {selectedAccounts.length > 0 && `(${selectedAccounts.length} ${selectedAccounts.length === 1 ? 'red' : 'redes'})`}
            </Typography>
            {selectedAccounts.length === 0 ? (
              <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selecciona al menos una red para ver la vista previa.
                </Typography>
              </Box>
            ) : (
              <Stack gap={2}>
                {selectedAccounts.map((account) => {
                  const { networkLabel, networkBg, networkColor } = getPostNetworkInfo(account.id);
                  // Solo la primera imagen (no video) representa la card —
                  // el resto de los adjuntos se ven en la lista de chips de
                  // arriba, no hace falta duplicar el carrusel aquí.
                  const previewImage = selectedMedia.find((m) => m.mimeType.startsWith('image'));
                  return (
                    <Box key={account.id} sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
                      <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                        <Avatar sx={{ bgcolor: networkBg, color: networkColor, width: 32, height: 32, fontSize: 11, fontWeight: 600 }}>
                          {account.handle.replace('@', '').slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{account.handle}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {networkLabel} · Ahora
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ bgcolor: '#E0E0E0', borderRadius: 1.5, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, overflow: 'hidden' }}>
                        {previewImage ? (
                          <Box component="img" src={previewImage.url} alt={previewImage.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      {/* Picker de media — biblioteca mock filtrada por marca de la campaña
          activa (ver getMediaLibraryByBrand en lib/mock-data.ts). */}
      <Dialog open={mediaPickerOpen} onClose={() => setMediaPickerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjuntar media</DialogTitle>
        <DialogContent>
          {mediaLibrary.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Esta marca no tiene archivos en su biblioteca todavía.
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
              {mediaLibrary.map((m) => {
                const active = selectedMediaIds.includes(m.id);
                return (
                  <Grid item xs={4} key={m.id}>
                    <Box
                      onClick={() => toggleMedia(m.id)}
                      sx={{
                        cursor: 'pointer',
                        position: 'relative',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        aspectRatio: '1 / 1',
                        border: active ? '2px solid #E0A800' : '1px solid #E8E8E8',
                      }}
                    >
                      <Box component="img" src={m.url} alt={m.originalName} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {m.mimeType.startsWith('video') && (
                        <Chip
                          label="Video"
                          size="small"
                          sx={{ position: 'absolute', bottom: 4, left: 4, height: 18, fontSize: 9, bgcolor: 'rgba(0,0,0,0.65)', color: '#fff' }}
                        />
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMediaPickerOpen(false)} sx={{ color: 'secondary.main' }}>
            Listo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
