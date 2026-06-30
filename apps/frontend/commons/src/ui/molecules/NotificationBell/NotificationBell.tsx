'use client';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../../../hooks/useNotifications';

export function NotificationBell() {
  const { notifications } = useNotifications();
  const unread = notifications.filter((n) => !n.readAt).length;
  return (
    <IconButton>
      <Badge badgeContent={unread} color="error">
        <NotificationsIcon />
      </Badge>
    </IconButton>
  );
}
