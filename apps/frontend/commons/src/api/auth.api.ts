import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config/zone-urls';

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
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
