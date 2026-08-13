import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { Campaign, EligibleStaffMember, EligibleCm } from '@repo/ui/types';

// Vive en brands-front (no en web-shell, donde había quedado un stub vacío
// — ver limpieza en el plan de integración): en Multi-Zones cada zona es
// standalone, y es brands-front quien renderiza CreateCampaignDialog y las
// páginas de listado de campañas.

export interface CreateCampaignRequest {
  brandId: string;
  name: string;
  description?: string;
  objective?: string;
  cmId: string;
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
}

// cmId SÍ se puede volver a mandar (Fase J relajó RF-2.3) — el backend solo
// lo rechaza si la campaña ya está cmStatus:'aceptada'. Reasignar resetea
// cmStatus a 'pendiente' y notifica al nuevo CM.
export interface UpdateCampaignRequest {
  id: string;
  name?: string;
  description?: string;
  objective?: string;
  status?: 'active' | 'paused' | 'finished';
  startDate?: string;
  endDate?: string;
  cmId?: string;
}

export const campaignsApi = createApi({
  reducerPath: 'campaignsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Campaign'],
  endpoints: (builder) => ({
    listCampaigns: builder.query<Campaign[], void>({
      // El backend ya filtra por dueño/CM/diseñador asignado o Admin — no
      // hay filtro por brandId en la URL, se filtra client-side donde haga falta.
      query: () => 'campaigns',
      providesTags: ['Campaign'],
    }),
    getCampaign: builder.query<Campaign, string>({
      query: (id) => `campaigns/${id}`,
      providesTags: ['Campaign'],
    }),
    createCampaign: builder.mutation<Campaign, CreateCampaignRequest>({
      query: (body) => ({ url: 'campaigns', method: 'POST', body }),
      invalidatesTags: ['Campaign'],
    }),
    updateCampaign: builder.mutation<Campaign, UpdateCampaignRequest>({
      query: ({ id, ...body }) => ({ url: `campaigns/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Campaign'],
    }),
    deleteCampaign: builder.mutation<Campaign, string>({
      query: (id) => ({ url: `campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Campaign'],
    }),
    assignDesigner: builder.mutation<{ campaignId: string; userId: string }, { campaignId: string; userId: string }>({
      query: ({ campaignId, userId }) => ({ url: `campaigns/${campaignId}/designers`, method: 'POST', body: { userId } }),
      invalidatesTags: ['Campaign'],
    }),
    removeDesigner: builder.mutation<{ removed: true }, { campaignId: string; userId: string }>({
      query: ({ campaignId, userId }) => ({ url: `campaigns/${campaignId}/designers/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Campaign'],
    }),
    // categoryIds ordena por matchScore (Fase J) — sin filtrar a nadie fuera,
    // el buscador del diálogo necesita poder encontrar a cualquiera. Array
    // vacío = sin filtro (en vez de void/undefined, para no pelear con las
    // reglas de TS sobre acceso a propiedades en tipos void).
    listEligibleCMs: builder.query<EligibleCm[], string[]>({
      query: (categoryIds) =>
        categoryIds.length ? `campaigns/eligible-community-managers?categoryIds=${categoryIds.join(',')}` : 'campaigns/eligible-community-managers',
    }),
    listEligibleDesigners: builder.query<EligibleStaffMember[], void>({
      query: () => 'campaigns/eligible-designers',
    }),
    acceptCampaign: builder.mutation<Campaign, string>({
      query: (id) => ({ url: `campaigns/${id}/accept`, method: 'POST' }),
      invalidatesTags: ['Campaign'],
    }),
    rejectCampaign: builder.mutation<Campaign, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `campaigns/${id}/reject`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Campaign'],
    }),
  }),
});

export const {
  useListCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useAssignDesignerMutation,
  useRemoveDesignerMutation,
  useListEligibleCMsQuery,
  useListEligibleDesignersQuery,
  useAcceptCampaignMutation,
  useRejectCampaignMutation,
} = campaignsApi;
