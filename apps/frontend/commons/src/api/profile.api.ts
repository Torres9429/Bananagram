import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './authenticated-base-query';

// GET/PATCH me/profile (auth-service, ver profile.controller.ts) — el
// perfil operativo de CM/Diseñador (nombre, categorías, especialidades),
// distinto del perfil de marca (Cliente, ver brands.api.ts de cada zona).
// Vive en commons porque es un concepto de "el usuario actual", no de una
// zona en particular, mismo criterio que notificationsApi/catalogsApi.

export interface MyUserProfile {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  roleNames: string[];
  categories: { categoryId: string }[];
  specialties: { specialtyId: string }[];
}

export interface CompleteProfileRequest {
  name: string;
  avatarUrl?: string;
  categoryIds?: string[];
  specialtyIds?: string[];
}

export const profileApi = createApi({
  reducerPath: 'profileApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['MyProfile'],
  endpoints: (builder) => ({
    // null si el usuario todavía no completó su perfil nunca (dado de alta
    // por el Admin, sin registro público de por medio).
    getMyProfile: builder.query<MyUserProfile | null, void>({
      query: () => 'me/profile',
      providesTags: ['MyProfile'],
    }),
    completeProfile: builder.mutation<MyUserProfile, CompleteProfileRequest>({
      query: (body) => ({ url: 'me/profile', method: 'PATCH', body }),
      invalidatesTags: ['MyProfile'],
    }),
    // No invalida ['MyProfile'] a propósito: solo sube el archivo y devuelve
    // la URL de Cloudinary, no toca UserProfile.avatarUrl todavía — el
    // caller la guarda en estado local y la incluye en el siguiente
    // completeProfile() junto con el resto del formulario (una sola fuente
    // de verdad de "guardar", no dos). FormData como body: fetchBaseQuery ya
    // detecta FormData y deja que el navegador arme el Content-Type con el
    // boundary correcto — no forzar 'multipart/form-data' a mano.
    uploadAvatar: builder.mutation<{ avatarUrl: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: 'me/profile/avatar', method: 'POST', body: formData };
      },
    }),
  }),
});

export const { useGetMyProfileQuery, useCompleteProfileMutation, useUploadAvatarMutation } = profileApi;
