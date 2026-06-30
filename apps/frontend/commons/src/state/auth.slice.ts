import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  permissions: Record<string, string[]>;
  brandIds: string[];
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  brandIds?: string[];
  permissions?: Record<string, string[]>;
}

type AuthRootState = { auth: AuthState };

function decodeJwt(token: string): JwtPayload | null {
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

const initialState: AuthState = { user: null, accessToken: null, permissions: {}, brandIds: [] };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
      const payload = decodeJwt(action.payload.accessToken);
      if (payload) {
        state.user = { id: payload.sub, email: payload.email, role: payload.role };
        state.permissions = payload.permissions ?? {};
        state.brandIds = payload.brandIds ?? [];
      }
    },
    setPermissions(state, action: PayloadAction<{ permissions: Record<string, string[]>; brandIds: string[] }>) {
      state.permissions = action.payload.permissions;
      state.brandIds = action.payload.brandIds;
    },
    logout(state) { Object.assign(state, initialState); },
  },
});

export const { setCredentials, setPermissions, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
export const selectUser = (s: AuthRootState) => s.auth.user;
export const selectPermissions = (s: AuthRootState) => s.auth.permissions;
export const selectBrandIds = (s: AuthRootState) => s.auth.brandIds;
