import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// Ideas guardadas desde la Alexa Skill (docs/skill/backend-api-reference.md)
// — la plataforma web solo lista y elimina, nunca crea (las ideas solo se
// generan/dictan por voz). GET /api/ideas ya está proxeado por el gateway
// hacia alexa-service, se consume igual que cualquier otro endpoint.
export interface ContentIdea {
  id: string;
  campaignId: string;
  createdBy: string;
  title: string | null;
  text: string;
  source: 'sugerida' | 'propia';
  createdAt: string;
  updatedAt: string;
}

export const ideasApi = createApi({
  reducerPath: 'ideasApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Idea'],
  endpoints: (builder) => ({
    listIdeasByCampaign: builder.query<ContentIdea[], string>({
      query: (campaignId) => `ideas?campaignId=${campaignId}`,
      providesTags: ['Idea'],
    }),
    deleteIdea: builder.mutation<ContentIdea, string>({
      query: (id) => ({ url: `ideas/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Idea'],
    }),
  }),
});

export const { useListIdeasByCampaignQuery, useDeleteIdeaMutation } = ideasApi;
