import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { PostStatus, SocialNetwork } from '@repo/ui/types';

// Solo lectura — brands-front solo necesita listar las publicaciones de una
// campaña para la sección "Publicaciones recientes" del detalle (Fase N4).
// Crear/editar publicaciones sigue viviendo en posts-front (zona dueña del
// dominio); cada Multi-Zone es standalone, así que se apunta al mismo
// GET /posts real en vez de importar el slice de esa zona.
export interface PostListItem {
  id: string;
  content: string;
  status: PostStatus;
  createdAt: string;
  socialNetworks: { socialNetwork: SocialNetwork }[];
}

export const postsApi = createApi({
  reducerPath: 'brandsFrontPostsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  endpoints: (builder) => ({
    listPostsByCampaign: builder.query<PostListItem[], string>({
      query: (campaignId) => `posts?campaignId=${campaignId}`,
    }),
  }),
});

export const { useListPostsByCampaignQuery } = postsApi;
