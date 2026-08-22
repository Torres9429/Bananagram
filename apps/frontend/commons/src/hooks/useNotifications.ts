'use client';

import { useGetMyNotificationsQuery } from '../api/notifications.api';

// Sin pollingInterval: useNotificationStream() (montado en providers.tsx de
// cada zona) ya empuja cada notificación nueva al cache vía SSE apenas se
// crea (Fase L) — el poll de 30s era puro trabajo redundante, no un
// fallback real (el stream ya reintenta con backoff propio si se cae).
export function useNotifications() {
  const { data: notifications = [], refetch } = useGetMyNotificationsQuery();
  return { notifications, refetch };
}
