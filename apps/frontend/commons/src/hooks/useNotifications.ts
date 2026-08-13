'use client';

import { useGetMyNotificationsQuery } from '../api/notifications.api';

export function useNotifications() {
  const { data: notifications = [], refetch } = useGetMyNotificationsQuery(undefined, { pollingInterval: 30000 });
  return { notifications, refetch };
}
