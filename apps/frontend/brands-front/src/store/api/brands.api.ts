import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { Brand } from '@repo/ui/types';

// createBrand agregado para conectar marcas/redes sociales reales (ver plan
// "conectar una marca y una cuenta de Instagram reales") — el resto de la
// gestión de Marcas (editar, eliminar, listar cuentas conectadas) sigue
// fuera de alcance, esta fase solo desbloquea crear + obtener el connectUrl
// de Ayrshare.
export interface CreateBrandRequest {
  name: string;
  slug: string;
  profileType?: string;
  categoryId?: string;
  logoUrl?: string;
  primaryColor?: string;
  allowedSocial: string[];
}

// connectUrl solo viene en la respuesta de creación (BrandsService.
// toBrandResponse lo agrega ahí, nunca en GET) — por eso no vive en el tipo
// Brand compartido, se extiende puntual solo para este endpoint.
export interface CreateBrandResponse extends Brand {
  connectUrl?: string;
}

export interface UpdateBrandRequest {
  name?: string;
  slug?: string;
  profileType?: string;
  categoryId?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Brand'],
  endpoints: (builder) => ({
    // GET /brands ya viene filtrado por el backend (dueño, CM/diseñador
    // asignado a alguna campaña de la marca, o Admin ve todas).
    listMyBrands: builder.query<Brand[], void>({
      query: () => 'brands',
      providesTags: ['Brand'],
    }),
    getBrand: builder.query<Brand, string>({
      query: (id) => `brands/${id}`,
      providesTags: ['Brand'],
    }),
    createBrand: builder.mutation<CreateBrandResponse, CreateBrandRequest>({
      query: (body) => ({ url: 'brands', method: 'POST', body }),
      invalidatesTags: ['Brand'],
    }),
    updateBrand: builder.mutation<Brand, { id: string; body: UpdateBrandRequest }>({
      query: ({ id, body }) => ({ url: `brands/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Brand'],
    }),
    // Regenera el connectUrl de Ayrshare para una marca ya existente (a
    // diferencia del connectUrl de createBrand, que solo se ve una vez) —
    // permite conectar/reconectar redes después de la creación.
    createConnectUrl: builder.mutation<{ connectUrl: string }, { id: string; allowedSocial?: string[] }>({
      query: ({ id, allowedSocial }) => ({ url: `brands/${id}/connect-url`, method: 'POST', body: { allowedSocial } }),
    }),
    // No invalida ['Brand'] a propósito: solo sube el archivo y devuelve la
    // URL de Cloudinary, no toca Brand.logoUrl todavía — el caller la guarda
    // en estado local y la incluye en el siguiente updateBrand() junto con
    // el resto del formulario de "Editar perfil" (mismo patrón que
    // profileApi.uploadAvatar en commons).
    uploadLogo: builder.mutation<{ logoUrl: string }, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: `brands/${id}/logo`, method: 'POST', body: formData };
      },
    }),
  }),
});

export const {
  useListMyBrandsQuery,
  useGetBrandQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useCreateConnectUrlMutation,
  useUploadLogoMutation,
} = brandsApi;
