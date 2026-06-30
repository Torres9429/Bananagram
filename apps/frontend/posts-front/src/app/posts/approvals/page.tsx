'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { ProtectedAction, usePermissions } from '@repo/ui';
import { MOCK_POSTS, getPostNetworkInfo } from '../../../lib/mock-data';
import { NetworkAvatar } from '../../../components/NetworkAvatar';
import { CampaignDot } from '../../../components/CampaignDot';
import { PostsTabs } from '../../../components/PostsTabs';

export default function PostsApprovalPage() {
  const router = useRouter();
  const { can, canAny } = usePermissions();
  const draftPosts = MOCK_POSTS.filter((p) => p.status === 'borrador');
  const reviewPosts = MOCK_POSTS.filter((p) => p.status === 'en_revision');
  const rejectedPosts = MOCK_POSTS.filter((p) => p.status === 'rechazado');

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
            <Card key={post.id} elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2 }}>
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
                  <Button size="small" variant="contained" sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}>
                    Enviar a revisión →
                  </Button>
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
            <Card key={post.id} elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2 }}>
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
                    <ProtectedAction module="post" action="reject">
                      <Button size="small" variant="outlined" sx={{ color: '#C62828', borderColor: '#C62828' }}>
                        Rechazar
                      </Button>
                    </ProtectedAction>
                    <ProtectedAction module="post" action="approve">
                      <Button size="small" variant="contained" sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>
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
            <Card key={post.id} elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mb: 2 }}>
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
                <Stack direction="row" justifyContent="flex-end">
                  <ProtectedAction module="post" action="create">
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
                      onClick={() => router.push('/posts/new')}
                    >
                      Editar y reenviar →
                    </Button>
                  </ProtectedAction>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}
      </Box>
    </Box>
  );
}
