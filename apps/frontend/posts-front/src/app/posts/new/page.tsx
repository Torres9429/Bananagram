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
import { PrimaryButton } from '@repo/ui/ui';
import {
  CHAR_LIMITS,
  MOCK_CAMPAIGNS,
  NETWORK_LABELS,
  MOCK_AI_SUGGESTIONS,
  MOCK_TIME_SLOTS,
  getSocialAccountsForCampaign,
} from '../../../lib/mock-data';
import type { SocialAccount } from '../../../interfaces/interface';

export default function NewPostPage() {
  const router = useRouter();
  const [campaignId, setCampaignId] = useState('c1');
  const [brandProfileId, setBrandProfileId] = useState('bp1');
  const [content, setContent] = useState('');
  const [datetime, setDatetime] = useState('');

  const profiles: SocialAccount[] = getSocialAccountsForCampaign(campaignId);
  const selectedProfile = profiles.find((p) => p.id === brandProfileId) ?? profiles[0] ?? null;

  const network = selectedProfile?.socialNetwork ?? 'IG';
  const limit = CHAR_LIMITS[network] ?? 2200;
  const charCount = content.length;
  const nearLimit = charCount > limit * 0.9;
  const hashtags = content.match(/#\S+/g) ?? [];
  const previewText = content.length > 140 ? `${content.slice(0, 140)}...` : content;

  function handleCampaignChange(e: SelectChangeEvent) {
    const newCampaignId = e.target.value;
    setCampaignId(newCampaignId);
    // Reseteamos al primer perfil disponible de la nueva campaña.
    const newProfiles = getSocialAccountsForCampaign(newCampaignId);
    setBrandProfileId(newProfiles[0]?.id ?? '');
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
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                    {c.name} — {c.brand}
                  </Stack>
                </MenuItem>
              ))}
              <MenuItem value="none"><em>Sin campaña</em></MenuItem>
            </Select>

            {/* SocialAccount (red social de la marca) */}
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Perfil de publicación</Typography>
            {profiles.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                Esta campaña no tiene perfiles de red social configurados aún.
              </Alert>
            ) : (
              <Stack direction="row" gap={1} flexWrap="wrap" mb={2.5}>
                {profiles.map((p) => {
                  const active = brandProfileId === p.id;
                  return (
                    <Chip
                      key={p.id}
                      label={
                        <Stack direction="row" gap={0.5} alignItems="center">
                          <Typography variant="caption" fontWeight={700}>{p.socialNetwork}</Typography>
                          <Typography variant="caption" color="inherit" sx={{ opacity: 0.75 }}>{p.handle}</Typography>
                        </Stack>
                      }
                      onClick={() => setBrandProfileId(p.id)}
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
              placeholder={`Escribe el copy para ${selectedProfile ? NETWORK_LABELS[selectedProfile.socialNetwork] ?? selectedProfile.socialNetwork : 'la red'}…`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5} mb={2}>
              <Typography variant="caption" color="text.secondary">
                Límite {NETWORK_LABELS[network as keyof typeof NETWORK_LABELS] ?? network}: {limit.toLocaleString()} caracteres
              </Typography>
              <Typography variant="caption" sx={{ color: nearLimit ? '#C62828' : '#6B6B6B', fontWeight: nearLimit ? 700 : 400 }}>
                {charCount.toLocaleString()} / {limit.toLocaleString()}
              </Typography>
            </Stack>

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
                    vs benchmark {NETWORK_LABELS[network as keyof typeof NETWORK_LABELS] ?? network} 3.5%
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
                onClick={() => router.push('/posts')}
              >
                Guardar borrador
              </Button>
              <PrimaryButton
                disabled={!content.trim() || !selectedProfile}
                onClick={() => router.push('/posts/approvals')}
              >
                Enviar a revisión →
              </PrimaryButton>
            </Stack>
          </Paper>
        </Grid>

        {/* Columna derecha — vista previa */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3, position: 'sticky', top: 24 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>Vista previa</Typography>
            <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
              {selectedProfile ? (
                <>
                  <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                    <Avatar sx={{ bgcolor: '#E0A800', color: 'primary.contrastTextMuted', width: 32, height: 32, fontSize: 11, fontWeight: 600 }}>
                      {selectedProfile.handle.replace('@', '').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{selectedProfile.handle}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {NETWORK_LABELS[selectedProfile.socialNetwork] ?? selectedProfile.socialNetwork} · Ahora
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ bgcolor: '#E0E0E0', borderRadius: 1.5, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#9E9E9E' }}>Imagen adjunta</Typography>
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
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Selecciona una campaña con perfiles configurados para ver la vista previa.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
