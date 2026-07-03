'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StatusChip, ProtectedAction } from '@repo/ui';
import { MOCK_POSTS, MOCK_STATUS_HISTORY, getPostNetworkInfo } from '../../../lib/mock-data';

const NETWORK_NAMES: Record<string, string> = {
  IG: 'Instagram',
  TK: 'TikTok',
  LI: 'LinkedIn',
  FB: 'Facebook',
  X: 'X',
  YT: 'YouTube',
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Mock: estado local, sin persistencia — mismo patrón ya usado en
  // /posts/approvals y en ClientSection.tsx (brands-front).
  const [post, setPost] = useState(() => MOCK_POSTS.find((p) => p.id === params.id) ?? MOCK_POSTS.find((p) => p.id === 'p2')!);
  const history = MOCK_STATUS_HISTORY[post.id] ?? [];
  const { network, networkBg, networkColor } = getPostNetworkInfo(post);

  function handleApprove() {
    setPost((prev) => ({ ...prev, status: 'aprobado' }));
  }

  function handleReject() {
    setPost((prev) => ({ ...prev, status: 'rechazado' }));
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
                  Red social
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {NETWORK_NAMES[network] ?? network}
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
                <Button
                  variant="contained"
                  sx={{ bgcolor: '#E0A800', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
                  onClick={() => router.push('/posts/new')}
                >
                  Enviar a revisión →
                </Button>
              </ProtectedAction>
              <ProtectedAction module="post" action="schedule">
                <Button variant="contained" sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}>
                  Programar
                </Button>
              </ProtectedAction>
              <ProtectedAction module="post" action="reject">
                <Button variant="outlined" onClick={handleReject} sx={{ color: '#C62828', borderColor: '#C62828' }}>
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

          <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Historial de estados
            </Typography>
            <Box sx={{ position: 'relative', pl: 2.5 }}>
              <Box sx={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, bgcolor: '#E8E8E8' }} />
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
                Video TikTok 9:16
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              {post.content}
            </Typography>
            <Stack direction="row" gap={0.5} mt={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                TikTok
              </Typography>
              <Typography variant="caption" fontWeight={500}>
                @nikemx
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={network}
              sx={{ bgcolor: networkBg, color: networkColor, fontWeight: 600, mt: 1 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
