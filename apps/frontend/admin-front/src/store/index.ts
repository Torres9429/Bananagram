import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, catalogsApi } from '@repo/ui/state';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
  },
  middleware: (gDM) => gDM().concat(authApi.middleware, catalogsApi.middleware),
});
