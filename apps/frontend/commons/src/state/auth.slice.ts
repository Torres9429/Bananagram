import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, AuthState, JwtPayload } from '../types/auth.types';

export type { AuthUser, AuthState, JwtPayload };

type AuthRootState = { auth: AuthState };

// Codifica un payload en base64 seguro para JWT, preservando caracteres no
// ASCII (nombres con tildes: "Ana García", "Roberto Fernández", "Laura
// Méndez") — btoa() por sí solo trata el string como Latin-1 y no coincide
// con el esquema de bytes UTF-8 que decodeJwt() espera al decodificar, lo
// que hacía fallar el login silenciosamente (decodeJwt devolvía null) para
// cualquier usuario con un carácter acentuado en el payload. TextEncoder da
// los bytes UTF-8 reales; btoa() solo empaqueta esos bytes en base64.
function toBinaryString(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

export function encodeMockJwt(payload: object): string {
  const header = btoa(toBinaryString(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = btoa(toBinaryString(JSON.stringify(payload)));
  return `${header}.${body}.mock-signature`;
}

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
