import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, catalogsApi, notificationsApi } from '@repo/ui/state';
import { postsApi } from './api/posts.api';
import { campaignsApi } from './api/campaigns.api';

// notificationsApi: TopBar (con NotificationBell) se monta en AppShell de
// esta zona — sin esta pieza, useNotifications() truena en runtime
// ("Middleware for RTK-Query API ... has not been added"). catalogsApi:
// selector de redes sociales real en /posts/new (Fase N).
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [postsApi.reducerPath]: postsApi.reducer,
    [campaignsApi.reducerPath]: campaignsApi.reducer,
  },
  middleware: (gDM) =>
    gDM().concat(authApi.middleware, catalogsApi.middleware, notificationsApi.middleware, postsApi.middleware, campaignsApi.middleware),
});
