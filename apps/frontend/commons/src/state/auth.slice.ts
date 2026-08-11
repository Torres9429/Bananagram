import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, AuthState, JwtPayload } from '../types/auth.types';
import { decodeJwt, encodeMockJwt } from './jwt';

export type { AuthUser, AuthState, JwtPayload };
// Re-exportados para no romper a los consumidores existentes de
// @repo/ui/state — la implementación real vive en ./jwt (ver ese archivo
// para por qué está separado: lo importa también el Edge Middleware).
export { decodeJwt, encodeMockJwt };

type AuthRootState = { auth: AuthState };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  permissions: {},
  ownedBrandIds: [],
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
      const payload = decodeJwt(action.payload.accessToken);
      if (payload) {
        state.user = {
          id: payload.sub,
          email: payload.email,
          // El JWT real no trae name/status (viven en UserProfile, otro
          // servicio) — cae a email/'active' en vez de dejarlos undefined.
          name: payload.name ?? payload.email,
          roles: payload.roles ?? [],
          status: payload.status ?? 'active',
          avatarUrl: payload.avatarUrl ?? null,
        };
        state.permissions = payload.permissions ?? {};
        // Solo tiene sentido para Cliente — ver AuthState.ownedBrandIds.
        // brandIds es el nombre real del backend (siempre [] hoy, ver
        // ADR-0004); ownedBrandIds es el nombre que usa el JWT mock.
        state.ownedBrandIds = payload.brandIds ?? payload.ownedBrandIds ?? [];
        state.isAuthenticated = true;
      }
    },
    logout(state) { Object.assign(state, initialState); },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectUser = (s: AuthRootState) => s.auth.user;
export const selectPermissions = (s: AuthRootState) => s.auth.permissions;
export const selectOwnedBrandIds = (s: AuthRootState) => s.auth.ownedBrandIds;
export const selectIsAuthenticated = (s: AuthRootState) => s.auth.isAuthenticated;
