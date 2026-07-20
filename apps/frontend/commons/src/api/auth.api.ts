import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/zone-urls';
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
  refreshToken: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: 'include' }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<void, RegisterRequest>({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    // Respaldados ahora por PasswordResetToken en modelo.txt — el backend
    // busca el User por email y crea el token internamente; nunca vuelve en
    // la respuesta HTTP (se envía por correo). resetPassword recibe el UUID
    // que va en el link (?token=...), no el JWT de sesión.
    forgotPassword: builder.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: 'auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<void, ResetPasswordRequest>({
      query: (body) => ({ url: 'auth/reset-password', method: 'POST', body }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useForgotPasswordMutation, useResetPasswordMutation } = authApi;
