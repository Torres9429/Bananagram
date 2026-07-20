import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, AuthState, JwtPayload } from '../types/auth.types';

export type { AuthUser, AuthState, JwtPayload };

type AuthRootState = { auth: AuthState };

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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
          name: payload.name,
          role: payload.role,
          status: payload.status,
          avatarUrl: payload.avatarUrl ?? null,
        };
        state.permissions = payload.permissions ?? {};
        // Solo tiene sentido para Cliente — ver AuthState.ownedBrandIds.
        state.ownedBrandIds = payload.ownedBrandIds ?? [];
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
