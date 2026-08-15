import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/zone-urls';
import { getCookieToken } from '../session/cookieSession';
import type { ForgotPasswordRequest, ResetPasswordRequest } from '../types/password-reset.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  // El backend devuelve la fila completa de Prisma RefreshToken (no un string
  // plano) — el valor usable para /auth/refresh es refreshToken.token.
  refreshToken: { token: string; [key: string]: unknown };
}

export const authApi = createApi({
  reducerPath: 'authApi',
  // Bearer puro: el token viaja en el header Authorization, no en una cookie
  // que el navegador adjunte solo (el backend no manda Set-Cookie). La cookie
  // JS de cookieSession.ts es solo el contenedor de storage cross-zona (ver
  // ADR-0004 / plan de integración) — prepareHeaders la lee explícitamente.
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getCookieToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<void, RegisterRequest>({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    // Respaldados por PasswordResetToken en modelo.txt — el backend busca el
    // User por email y crea el token internamente; nunca vuelve en la
    // respuesta HTTP (se envía por correo). resetPassword recibe el UUID que
    // va en el link (?token=...), no el JWT de sesión. Rutas reales:
    // POST /auth/password-reset/{request,confirm} (auth.controller.ts) — no
    // /auth/forgot-password ni /auth/reset-password.
    forgotPassword: builder.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: 'auth/password-reset/request', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<void, ResetPasswordRequest>({
      // El DTO real espera `newPassword`, no `password` — se traduce acá para
      // no tocar el tipo ResetPasswordRequest que ya consume ResetPasswordForm.
      query: ({ token, password }) => ({
        url: 'auth/password-reset/confirm',
        method: 'POST',
        body: { token, newPassword: password },
      }),
    }),
    // Vinculación con la Alexa Skill — restringido en el backend a
    // Cliente/Diseñador/Administrador (auth.service.ts.createLinkCode).
    // El código dura 10 minutos (expiresAt lo confirma el backend).
    createLinkCode: builder.mutation<{ code: string; expiresAt: string }, void>({
      query: () => ({ url: 'auth/link-code', method: 'POST' }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useCreateLinkCodeMutation,
} = authApi;
