import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { PostStatus, PostSocialAccountStatus, SocialNetwork, SocialAccount } from '@repo/ui/types';

// Fase N — primer slice real de posts-front (antes 100% mock). Los tipos de
// abajo reflejan el shape exacto que devuelve GET /posts y GET /posts/:id
// (core-service, posts.service.ts listPosts/getPost) — más anidado que el
// `Post` de @repo/ui/types (pensado para otro momento del alineamiento de
// tipos), así que se definen locales en vez de forzar ese tipo viejo.

export interface RealMedia {
  id: string;
  brandId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  url: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

export interface RealPostMedia {
  postId: string;
  mediaId: string;
  order: number;
  media: RealMedia;
}

export interface RealPostSocialNetwork {
  postId: string;
  socialNetworkId: string;
  socialNetwork: SocialNetwork;
}

export interface RealPostSocialAccount {
  id: string;
  postId: string;
  socialAccountId: string;
  socialAccount: SocialAccount & { socialNetwork: SocialNetwork };
  status: PostSocialAccountStatus;
  socialPostId?: string | null;
  postUrl?: string | null;
  publishedAt?: string | null;
  errorMessage?: string | null;
}

export interface RealPostStatusHistory {
  id: string;
  postId: string;
  fromStatus?: PostStatus | null;
  toStatus: PostStatus;
  changedBy: string;
  comment?: string | null;
  createdAt: string;
}

// Shape de una fila de GET /posts (list) — sin brand/campaign/statusHistory
// completos (el service solo los incluye en getPost, el detalle).
export interface RealPostListItem {
  id: string;
  brandId: string;
  campaignId: string;
  content: string;
  instructions?: string | null;
  status: PostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdBy: string;
  ayrsharePostId?: string | null;
  createdAt: string;
  socialNetworks: RealPostSocialNetwork[];
  media: RealPostMedia[];
}

export interface RealPost extends RealPostListItem {
  brand: { id: string; name: string; ownerId: string };
  campaign: { id: string; name: string; cmId: string; designers: { userId: string }[] };
  socialAccounts: RealPostSocialAccount[];
  statusHistory: RealPostStatusHistory[];
}

export interface CreatePostRequest {
  brandId: string;
  campaignId: string;
  socialNetworkIds: string[];
  content: string;
  instructions?: string;
  scheduledAt?: string;
}

export interface ListPostsFilters {
  campaignId?: string;
  brandId?: string;
  status?: PostStatus;
}

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Post'],
  endpoints: (builder) => ({
    listPosts: builder.query<RealPostListItem[], ListPostsFilters | undefined>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.campaignId) params.set('campaignId', filters.campaignId);
        if (filters?.brandId) params.set('brandId', filters.brandId);
        if (filters?.status) params.set('status', filters.status);
        const qs = params.toString();
        return qs ? `posts?${qs}` : 'posts';
      },
      providesTags: ['Post'],
    }),
    getPost: builder.query<RealPost, string>({
      query: (id) => `posts/${id}`,
      providesTags: ['Post'],
    }),
    createPost: builder.mutation<RealPostListItem, CreatePostRequest>({
      query: (body) => ({ url: 'posts', method: 'POST', body }),
      invalidatesTags: ['Post'],
    }),
    submitForReview: builder.mutation<RealPostListItem, string>({
      query: (id) => ({ url: `posts/${id}/submit-for-review`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    approvePost: builder.mutation<RealPostListItem, string>({
      query: (id) => ({ url: `posts/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    rejectPost: builder.mutation<RealPostListItem, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `posts/${id}/reject`, method: 'POST', body: { comment } }),
      invalidatesTags: ['Post'],
    }),
    schedulePost: builder.mutation<RealPostListItem, { id: string; scheduledAt?: string }>({
      query: ({ id, scheduledAt }) => ({ url: `posts/${id}/schedule`, method: 'POST', body: { scheduledAt } }),
      invalidatesTags: ['Post'],
    }),
    // Fase O — segundo tramo: rechazo del Cliente (aprobado → rechazado_cliente).
    clientRejectPost: builder.mutation<RealPostListItem, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `posts/${id}/client-reject`, method: 'POST', body: { comment } }),
      invalidatesTags: ['Post'],
    }),
    // El CM reenvía al Diseñador (rechazado_cliente → borrador) — comentario
    // opcional, el motivo del Cliente siempre llega por separado (payload de
    // la notificación + historial), no depende de que el CM agregue algo.
    forwardToDesigner: builder.mutation<RealPostListItem, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({ url: `posts/${id}/forward-to-designer`, method: 'POST', body: { comment } }),
      invalidatesTags: ['Post'],
    }),
    // Edición de contenido, sin cambiar status — borrador/rechazado (Diseñador/
    // CM/dueño de marca/admin) o rechazado_cliente (solo CM, "editarla él mismo").
    updatePost: builder.mutation<RealPostListItem, { id: string; content?: string; instructions?: string; socialNetworkIds?: string[] }>({
      query: ({ id, ...body }) => ({ url: `posts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Post'],
    }),
    cancelPost: builder.mutation<RealPostListItem, string>({
      query: (id) => ({ url: `posts/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Post'],
    }),
    // multipart/form-data, no JSON — fetchBaseQuery detecta FormData y deja
    // que el navegador ponga el boundary correcto, no forzar Content-Type
    // a mano (rompería el parseo en el backend).
    uploadMedia: builder.mutation<RealPost, { id: string; files: File[] }>({
      query: ({ id, files }) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return { url: `posts/${id}/media`, method: 'POST', body: formData };
      },
      invalidatesTags: ['Post'],
    }),
    removeMedia: builder.mutation<RealPost, { id: string; mediaId: string }>({
      query: ({ id, mediaId }) => ({ url: `posts/${id}/media/${mediaId}`, method: 'DELETE' }),
      invalidatesTags: ['Post'],
    }),
    // Usado para deshacer un borrador recién creado cuando el adjunto de
    // imagen falla justo después (ver posts/new/page.tsx) — no hay UI para
    // borrar un post ya "terminado" a propósito, el backend solo lo permite
    // en borrador/rechazado.
    deletePost: builder.mutation<void, string>({
      query: (id) => ({ url: `posts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Post'],
    }),
  }),
});

export const {
  useListPostsQuery,
  useGetPostQuery,
  useCreatePostMutation,
  useSubmitForReviewMutation,
  useApprovePostMutation,
  useRejectPostMutation,
  useSchedulePostMutation,
  useCancelPostMutation,
  useUploadMediaMutation,
  useRemoveMediaMutation,
  useDeletePostMutation,
  useClientRejectPostMutation,
  useForwardToDesignerMutation,
  useUpdatePostMutation,
} = postsApi;
