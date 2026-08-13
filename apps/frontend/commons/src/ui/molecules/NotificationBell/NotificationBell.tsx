'use client';
import { useState } from 'react';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../../../hooks/useNotifications';
import { useMarkNotificationReadMutation } from '../../../api/notifications.api';
import { ZONE_URLS } from '../../../config/zone-urls';
import type { Notification } from '../../../types/notification.types';

// type es un string libre en el backend (Notification.type) — solo se
// interpretan los tipos que ya emite CampaignsService (Fase J/L); cualquier
// otro cae al fallback genérico (el string crudo) en vez de romper.
function getMessage(n: Notification): string {
  const p = n.payload as Record<string, unknown>;
  const campaignName = typeof p.campaignName === 'string' ? p.campaignName : 'tu campaña';
  const reason = typeof p.reason === 'string' && p.reason.trim() ? p.reason : undefined;
  const postSnippet = typeof p.postSnippet === 'string' ? p.postSnippet : undefined;
  const clientReason = typeof p.clientReason === 'string' && p.clientReason.trim() ? p.clientReason : undefined;
  const cmComment = typeof p.cmComment === 'string' && p.cmComment.trim() ? p.cmComment : undefined;

  switch (n.type) {
    case 'campaign_pending_cm_approval':
      return `Nueva campaña pendiente de tu aprobación: "${campaignName}"`;
    case 'campaign_accepted':
      return `Tu campaña "${campaignName}" fue aceptada por el Community Manager.`;
    case 'campaign_rejected':
      return `Tu campaña "${campaignName}" fue rechazada${reason ? `: "${reason}"` : ''}.`;
    case 'post_submitted_for_review':
      return `Nueva publicación para revisar en "${campaignName}"${postSnippet ? `: "${postSnippet}"` : ''}`;
    case 'post_rejected_by_cm':
      return `El CM rechazó tu publicación en "${campaignName}"${reason ? `: "${reason}"` : ''}`;
    case 'post_pending_client_approval':
      return `Publicación lista para tu aprobación en "${campaignName}"${postSnippet ? `: "${postSnippet}"` : ''}`;
    case 'post_rejected_by_client':
      return `El cliente rechazó una publicación en "${campaignName}"${reason ? `: "${reason}"` : ''}`;
    case 'post_forwarded_to_designer':
      return `Te regresaron una publicación de "${campaignName}" — motivo del cliente: "${clientReason ?? 'sin detalle'}"${cmComment ? ` · Nota del CM: "${cmComment}"` : ''}`;
    default:
      return n.type;
  }
}

// Cada tipo lleva a quien lo recibe al lugar donde puede actuar — nunca solo
// se queda en "marcar como leída". brandsFront porque NotificationBell vive
// en TopBar, compartido por las 6 zonas — el destino real siempre es
// brands-front (mismo patrón cross-zona que ya usa ClientSection.tsx con
// ZONE_URLS.postsFront).
function getTargetUrl(n: Notification): string | null {
  const p = n.payload as Record<string, unknown>;
  const campaignId = typeof p.campaignId === 'string' ? p.campaignId : undefined;
  const brandId = typeof p.brandId === 'string' ? p.brandId : undefined;
  const postId = typeof p.postId === 'string' ? p.postId : undefined;

  switch (n.type) {
    case 'campaign_pending_cm_approval':
      return `${ZONE_URLS.brandsFront}/my-campaigns`;
    case 'campaign_accepted':
    case 'campaign_rejected':
      return brandId && campaignId ? `${ZONE_URLS.brandsFront}/brands/${brandId}/campaigns/${campaignId}` : null;
    case 'post_submitted_for_review':
    case 'post_rejected_by_cm':
    case 'post_pending_client_approval':
    case 'post_rejected_by_client':
    case 'post_forwarded_to_designer':
      return postId ? `${ZONE_URLS.postsFront}/posts/${postId}` : null;
    default:
      return null;
  }
}

export function NotificationBell() {
  const { notifications } = useNotifications();
  const [markRead] = useMarkNotificationReadMutation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const unread = notifications.filter((n) => !n.readAt).length;

  function handleItemClick(n: Notification) {
    if (!n.readAt) markRead(n.id);
    const target = getTargetUrl(n);
    if (target) window.location.href = target;
    else setAnchorEl(null);
  }

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 320, maxHeight: 400 } } }}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">Sin notificaciones</Typography>
          </MenuItem>
        ) : (
          notifications.slice(0, 10).map((n, i) => (
            <Box key={n.id}>
              {i > 0 && <Divider />}
              <MenuItem
                onClick={() => handleItemClick(n)}
                sx={{ whiteSpace: 'normal', alignItems: 'flex-start', bgcolor: n.readAt ? undefined : '#FFFDE7' }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={n.readAt ? 400 : 700}>
                    {getMessage(n)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(n.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </MenuItem>
            </Box>
          ))
        )}
      </Menu>
    </>
  );
}
