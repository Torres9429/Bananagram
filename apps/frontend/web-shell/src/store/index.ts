import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, notificationsApi, catalogsApi, sharedAdminApi } from '@repo/ui/state';

// notificationsApi: TopBar (con NotificationBell) se monta en el layout de
// esta zona (ver app/(app)/layout.tsx) — sin esta pieza, useNotifications()
// truena en runtime ("Middleware for RTK-Query API ... has not been added").
// catalogsApi/sharedAdminApi: DashboardAdmin necesita datos reales de
// catálogos/usuarios/roles/auditoría — ambos slices ya existen en @repo/ui,
// solo faltaba registrarlos en el store de esta zona.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
    [sharedAdminApi.reducerPath]: sharedAdminApi.reducer,
  },
  middleware: (gDM) =>
    gDM().concat(authApi.middleware, notificationsApi.middleware, catalogsApi.middleware, sharedAdminApi.middleware),
});
