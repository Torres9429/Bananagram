import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi, catalogsApi, notificationsApi } from '@repo/ui/state';
import { campaignsApi } from './api/campaigns.api';
import { brandsApi } from './api/brands.api';
import { socialAccountsApi } from './api/social-accounts.api';
import { metricsApi } from './api/metrics.api';
import { cmTeamApi } from './api/cm-team.api';
import { postsApi } from './api/posts.api';
import { selectedBrandReducer } from './selectedBrand.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    selectedBrand: selectedBrandReducer,
    [authApi.reducerPath]: authApi.reducer,
    [catalogsApi.reducerPath]: catalogsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [campaignsApi.reducerPath]: campaignsApi.reducer,
    [brandsApi.reducerPath]: brandsApi.reducer,
    [socialAccountsApi.reducerPath]: socialAccountsApi.reducer,
    [metricsApi.reducerPath]: metricsApi.reducer,
    [cmTeamApi.reducerPath]: cmTeamApi.reducer,
    [postsApi.reducerPath]: postsApi.reducer,
  },
  middleware: (gDM) =>
    gDM().concat(
      authApi.middleware,
      catalogsApi.middleware,
      notificationsApi.middleware,
      campaignsApi.middleware,
      brandsApi.middleware,
      socialAccountsApi.middleware,
      metricsApi.middleware,
      cmTeamApi.middleware,
      postsApi.middleware,
    ),
});
