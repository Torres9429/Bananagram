import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, catalogsApi, notificationsApi } from '@repo/ui/state';
import { adminApi } from './api/admin.api';

// notificationsApi: TopBar (con NotificationBell) se monta en AppShell de
// esta zona — sin esta pieza, useNotifications() truena en runtime
// ("Middleware for RTK-Query API ... has not been added").
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (gDM) =>
    gDM().concat(authApi.middleware, catalogsApi.middleware, notificationsApi.middleware, adminApi.middleware),
});
