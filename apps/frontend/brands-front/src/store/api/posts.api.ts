import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { PostStatus, SocialNetwork } from '@repo/ui/types';

// brands-front solo necesita leer publicaciones (sección "Publicaciones
// recientes" del detalle de campaña, y el calendario de /profile/calendar) y
// aprobar/rechazar desde el calendario — crear/editar sigue viviendo en
// posts-front (zona dueña del dominio). Cada Multi-Zone es standalone, así
// que se apunta al mismo GET /posts real en vez de importar el slice de esa
// otra zona (store distinto).
export interface PostListItem {
  id: string;
  brandId: string;
  campaignId: string;
  campaign: { name: string } | null;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  socialNetworks: { socialNetwork: SocialNetwork }[];
}

export interface ListPostsFilters {
  brandId?: string;
  campaignId?: string;
  status?: PostStatus;
}

export const postsApi = createApi({
  reducerPath: 'brandsFrontPostsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Post'],
  endpoints: (builder) => ({
    listPostsByCampaign: builder.query<PostListItem[], string>({
      query: (campaignId) => `posts?campaignId=${campaignId}`,
      providesTags: ['Post'],
    }),
    // Usado por el calendario — todas las publicaciones de la marca activa,
    // filtradas en cliente por el mes/semana visible (el backend no tiene
    // filtro de rango de fechas, ver plan de la Rama 4).
    listPostsByBrand: builder.query<PostListItem[], string>({
      query: (brandId) => `posts?brandId=${brandId}`,
      providesTags: ['Post'],
    }),
    approvePost: builder.mutation<PostListItem, string>({
      query: (id) => ({ url: `posts/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    rejectPost: builder.mutation<PostListItem, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `posts/${id}/reject`, method: 'POST', body: { comment } }),
      invalidatesTags: ['Post'],
    }),
  }),
});

export const {
  useListPostsByCampaignQuery,
  useListPostsByBrandQuery,
  useApprovePostMutation,
  useRejectPostMutation,
} = postsApi;
