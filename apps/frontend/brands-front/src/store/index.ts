import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, catalogsApi } from '@repo/ui/state';
import { campaignsApi } from './api/campaigns.api';
import { brandsApi } from './api/brands.api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
    [campaignsApi.reducerPath]: campaignsApi.reducer,
    [brandsApi.reducerPath]: brandsApi.reducer,
  },
  middleware: (gDM) => gDM().concat(authApi.middleware, catalogsApi.middleware, campaignsApi.middleware, brandsApi.middleware),
});
