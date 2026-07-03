import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi } from '@repo/ui';
import { analyticsFiltersReducer } from './analyticsFilters.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    analyticsFilters: analyticsFiltersReducer,
  },
  middleware: (gDM) => gDM().concat(authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
