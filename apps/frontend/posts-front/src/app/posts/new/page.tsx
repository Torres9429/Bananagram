'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import { CHAR_LIMITS, MOCK_CAMPAIGNS } from '../../../lib/mock-data';

const NETWORKS = [
  { code: 'IG', label: 'Instagram' },
  { code: 'TK', label: 'TikTok' },
  { code: 'LI', label: 'LinkedIn' },
  { code: 'FB', label: 'Facebook' },
  { code: 'X', label: 'X' },
  { code: 'YT', label: 'YouTube' },
];

const DEFAULT_CONTENT =
  '✨ El verano llegó con todo. Descubre nuestra colección SS25 — piezas pensadas para vivir el calor con estilo. #ZaraSS25 #Verano2025 #Moda';

const SUGGESTIONS = [
  'Agrega una llamada a la acción clara al final del copy.',
  'Reduce a 3-5 hashtags. Más de 7 reduce el alcance orgánico.',
  'Mejor horario para tu audiencia: 18:00–20:00.',
];

const TIME_SLOTS = ['Hoy 18:00', 'Mañana 12:00', 'Jue 09:00'];

export default function NewPostPage() {
  const router = useRouter();
  const [network, setNetwork] = useState('IG');
  const [campaignId, setCampaignId] = useState('c1');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [datetime, setDatetime] = useState('2025-06-30T18:00');

  const networkLabel = NETWORKS.find((n) => n.code === network)?.label ?? network;
  const limit = CHAR_LIMITS[network] ?? 2200;
  const charCount = content.length;
  const nearLimit = charCount > limit * 0.9;
  const hashtags = content.match(/#\S+/g) ?? [];
  const previewText = content.length > 120 ? `${content.slice(0, 120)}...` : content;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Red social
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
              {NETWORKS.map((n) => {
                const active = network === n.code;
                return (
                  <Chip
                    key={n.code}
                    label={n.code}
                    onClick={() => setNetwork(n.code)}
                    sx={{
                      cursor: 'pointer',
                      border: active ? '1px solid #FDC726' : '1px solid #E8E8E8',
                      bgcolor: active ? '#FFF8E1' : 'transparent',
                      color: active ? '#7A5C00' : '#1A1A1A',
                      fontWeight: active ? 600 : 400,
                    }}
                  />
                );
              })}
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" mb={1} mt={2}>
              Campaña
            </Typography>
            <Select
              fullWidth
              size="small"
              value={campaignId}
              onChange={(e: SelectChangeEvent) => setCampaignId(e.target.value)}
            >
              {MOCK_CAMPAIGNS.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} — {c.brand}
                </MenuItem>
              ))}
              <MenuItem value="none">Sin campaña</MenuItem>
            </Select>

            <Typography variant="subtitle2" color="text.secondary" mb={1} mt={2}>
              Contenido
            </Typography>
            <TextField
              multiline
              minRows={5}
              fullWidth
              placeholder="Escribe el copy..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Stack direction="row" justifyContent="flex-end" mt={0.5}>
              <Typography variant="caption" sx={{ color: nearLimit ? '#C62828' : '#6B6B6B' }}>
                {charCount} / {limit} — {networkLabel}
              </Typography>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" mb={1} mt={2}>
              Fecha y hora de publicación
            </Typography>
            <TextField
              type="datetime-local"
              fullWidth
              size="small"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
            />

            <Divider sx={{ mt: 3, mb: 2 }} />

            <Box sx={{ border: '1.5px solid #FDC726', borderRadius: 2, bgcolor: '#FFFDE7', p: 2 }}>
              <Chip
                label="IA · Análisis pre-publicación"
                size="small"
                sx={{ bgcolor: '#FDC726', color: '#7A5C00', fontWeight: 700, mb: 1.5 }}
              />

              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Engagement estimado
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#2E7D32' }}>
                      4.2%
                    </Typography>
                    <Chip size="small" label="Alto" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    vs benchmark Instagram 3.5%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#FDC726',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography fontWeight={700} sx={{ color: '#7A5C00' }}>
                    84
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7A5C00', fontSize: 9 }}>
                    Score
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="caption" fontWeight={600} color="text.secondary" mb={0.5} display="block">
                Sugerencias
              </Typography>
              <Stack gap={0.5}>
                {SUGGESTIONS.map((s, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    gap={1}
                    alignItems="flex-start"
                    sx={{ py: 0.75, borderBottom: i < SUGGESTIONS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                  >
                    <Typography fontWeight={700} sx={{ color: '#D4AC40' }}>
                      {i + 1}.
                    </Typography>
                    <Typography variant="caption">{s}</Typography>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" gap={1} mt={1.5} flexWrap="wrap">
                {TIME_SLOTS.map((slot) => (
                  <Chip
                    key={slot}
                    label={slot}
                    sx={{ cursor: 'pointer', bgcolor: '#FFF8E1', color: '#7A5C00', border: '1px solid #D4AC40' }}
                  />
                ))}
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
                fontStyle="italic"
                mt={1}
                display="block"
                fontSize={10}
              >
                Análisis orientativo generado por IA. Los resultados reales pueden variar.
              </Typography>
            </Box>

            <Stack direction="row" gap={1.5} mt={3}>
              <Button variant="outlined" sx={{ borderColor: '#E8E8E8', color: '#6B6B6B' }} onClick={() => router.push('/posts')}>
                Guardar borrador
              </Button>
              <Button
                variant="contained"
                sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
                onClick={() => router.push('/posts/approvals')}
              >
                Enviar a revisión →
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Vista previa
            </Typography>
            <Box sx={{ bgcolor: '#F7F7F7', borderRadius: 2, p: 2 }}>
              <Stack direction="row" gap={1} alignItems="center" mb={1.5}>
                <Avatar sx={{ bgcolor: '#FDC726', color: '#7A5C00', width: 32, height: 32, fontSize: 11, fontWeight: 600 }}>
                  ZA
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    @zaramx
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {networkLabel} · Ahora
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  bgcolor: '#E0E0E0',
                  borderRadius: 1.5,
                  height: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#9E9E9E' }}>
                  Imagen adjunta
                </Typography>
              </Box>

              <Typography variant="body2" mt={1.5} sx={{ lineHeight: 1.6 }}>
                {previewText}
              </Typography>

              <Stack direction="row" gap={0.75} mt={1} flexWrap="wrap">
                {hashtags.map((tag, i) => (
                  <Chip
                    key={i}
                    size="small"
                    label={tag}
                    sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontSize: 10, height: 20 }}
                  />
                ))}
              </Stack>

              <Chip size="small" label="BORRADOR" sx={{ bgcolor: '#F5F5F5', color: '#616161', fontWeight: 600, mt: 1.5 }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
