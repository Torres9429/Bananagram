import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './authenticated-base-query';
import type { Notification } from '../types/notification.types';

// Vive en commons (no en una zona) porque NotificationBell está montado en
// TopBar, compartido por todas las zonas (ver apps/frontend/*/components/
// AppShell.tsx) — mismo criterio que catalogs.api.ts/auth.api.ts.
export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getMyNotifications: builder.query<Notification[], void>({
      query: () => 'me/notifications',
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<Notification, string>({
      query: (id) => ({ url: `me/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const { useGetMyNotificationsQuery, useMarkNotificationReadMutation } = notificationsApi;
