import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, notificationsApi } from '@repo/ui/state';

// notificationsApi: TopBar (con NotificationBell) se monta en AppShell de
// esta zona — sin esta pieza, useNotifications() truena en runtime
// ("Middleware for RTK-Query API ... has not been added").
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (gDM) => gDM().concat(authApi.middleware, notificationsApi.middleware),
});
