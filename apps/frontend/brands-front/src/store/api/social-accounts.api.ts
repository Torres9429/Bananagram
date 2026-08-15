import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { SocialAccount, SocialNetwork } from '@repo/ui/types';

// GET /brands/:brandId/social-accounts incluye la relación socialNetwork
// (SocialAccountsService.listByBrand hace include: { socialNetwork: true }),
// por eso se extiende puntual aquí en vez de tocar el tipo SocialAccount
// compartido, que no la tiene.
export interface SocialAccountWithNetwork extends SocialAccount {
  socialNetwork: SocialNetwork;
}

export const socialAccountsApi = createApi({
  reducerPath: 'socialAccountsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['SocialAccount'],
  endpoints: (builder) => ({
    listSocialAccounts: builder.query<SocialAccountWithNetwork[], string>({
      query: (brandId) => `brands/${brandId}/social-accounts`,
      providesTags: ['SocialAccount'],
    }),
    syncSocialAccounts: builder.mutation<SocialAccountWithNetwork[], string>({
      query: (brandId) => ({ url: `brands/${brandId}/social-accounts/sync`, method: 'POST' }),
      invalidatesTags: ['SocialAccount'],
    }),
    // No borra el registro (SocialAccountsService.disconnect marca
    // active:false + disconnectedAt) — la cuenta se sigue viendo en la
    // lista con el chip "Inactiva", se puede reconectar más tarde.
    disconnectSocialAccount: builder.mutation<SocialAccountWithNetwork[], { brandId: string; id: string }>({
      query: ({ brandId, id }) => ({ url: `brands/${brandId}/social-accounts/${id}/disconnect`, method: 'POST' }),
      invalidatesTags: ['SocialAccount'],
    }),
  }),
});

export const { useListSocialAccountsQuery, useSyncSocialAccountsMutation, useDisconnectSocialAccountMutation } =
  socialAccountsApi;
