'use client';

import type { Notification } from '../types/notification.types';

// Diseño sin backend: no se consume ninguna API todavía.
// Cuando exista el endpoint, definir getNotifications en api/notifications.api.ts
// y reemplazar este stub por useGetNotificationsQuery(undefined, { pollingInterval: 30000 }).
export function useNotifications() {
  return { notifications: [] as Notification[], refetch: () => {} };
}
