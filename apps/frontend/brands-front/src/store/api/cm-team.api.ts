import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// Equipo GENERAL del CM (Fase J) — distinto del equipo por campaña
// (campaigns.api.ts assignDesigner/removeDesigner). Prefijo propio /cm-team
// (no /me/team): el gateway enruta todo /api/me/* a auth-service, esto vive
// en core-service.
export interface CmTeamMember {
  designerUserId: string;
  name: string;
  avatarUrl: string | null;
  addedAt: string;
}

export const cmTeamApi = createApi({
  reducerPath: 'cmTeamApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['CmTeam'],
  endpoints: (builder) => ({
    listMyTeam: builder.query<CmTeamMember[], void>({
      query: () => 'cm-team',
      providesTags: ['CmTeam'],
    }),
    addToMyTeam: builder.mutation<CmTeamMember, string>({
      query: (designerUserId) => ({ url: 'cm-team', method: 'POST', body: { designerUserId } }),
      invalidatesTags: ['CmTeam'],
    }),
    removeFromMyTeam: builder.mutation<{ removed: true }, string>({
      query: (designerUserId) => ({ url: `cm-team/${designerUserId}`, method: 'DELETE' }),
      invalidatesTags: ['CmTeam'],
    }),
  }),
});

export const { useListMyTeamQuery, useAddToMyTeamMutation, useRemoveFromMyTeamMutation } = cmTeamApi;
