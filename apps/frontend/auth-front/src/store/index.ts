import { configureStore } from '@reduxjs/toolkit';
import { authReducer, authApi } from '@repo/ui/state';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (gDM) => gDM().concat(authApi.middleware),
});
