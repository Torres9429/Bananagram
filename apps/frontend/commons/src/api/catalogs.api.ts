import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './authenticated-base-query';
import type { CatalogItem } from '../types/catalog.types';
import type { SocialNetwork, SocialNetworkCode } from '../types/social-network.types';

// Compartido entre admin-front (CRUD completo) y brands-front (solo lectura,
// para el picker de categorías al crear una campaña) — por eso vive en
// commons y no dentro de una sola zona, mismo criterio que auth.api.ts.

export interface UpsertCatalogItemRequest {
  name: string;
}

export interface UpsertSocialNetworkRequest {
  name: string;
  code: SocialNetworkCode;
  baseEngagementRate: number;
}

export const catalogsApi = createApi({
  reducerPath: 'catalogsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Category', 'Specialty', 'SocialNetwork'],
  endpoints: (builder) => ({
    listCategories: builder.query<CatalogItem[], void>({
      query: () => 'catalogs/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<CatalogItem, UpsertCatalogItemRequest>({
      query: (body) => ({ url: 'catalogs/categories', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<CatalogItem, { id: string } & Partial<UpsertCatalogItemRequest>>({
      query: ({ id, ...body }) => ({ url: `catalogs/categories/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<CatalogItem, string>({
      query: (id) => ({ url: `catalogs/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Category'],
    }),

    listSpecialties: builder.query<CatalogItem[], void>({
      query: () => 'catalogs/specialties',
      providesTags: ['Specialty'],
    }),
    createSpecialty: builder.mutation<CatalogItem, UpsertCatalogItemRequest>({
      query: (body) => ({ url: 'catalogs/specialties', method: 'POST', body }),
      invalidatesTags: ['Specialty'],
    }),
    updateSpecialty: builder.mutation<CatalogItem, { id: string } & Partial<UpsertCatalogItemRequest>>({
      query: ({ id, ...body }) => ({ url: `catalogs/specialties/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Specialty'],
    }),
    deleteSpecialty: builder.mutation<CatalogItem, string>({
      query: (id) => ({ url: `catalogs/specialties/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Specialty'],
    }),

    listSocialNetworks: builder.query<SocialNetwork[], void>({
      query: () => 'catalogs/social-networks',
      providesTags: ['SocialNetwork'],
    }),
    createSocialNetwork: builder.mutation<SocialNetwork, UpsertSocialNetworkRequest>({
      query: (body) => ({ url: 'catalogs/social-networks', method: 'POST', body }),
      invalidatesTags: ['SocialNetwork'],
    }),
    updateSocialNetwork: builder.mutation<SocialNetwork, { id: string } & Partial<UpsertSocialNetworkRequest>>({
      query: ({ id, ...body }) => ({ url: `catalogs/social-networks/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['SocialNetwork'],
    }),
    deleteSocialNetwork: builder.mutation<SocialNetwork, string>({
      query: (id) => ({ url: `catalogs/social-networks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SocialNetwork'],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useListSpecialtiesQuery,
  useCreateSpecialtyMutation,
  useUpdateSpecialtyMutation,
  useDeleteSpecialtyMutation,
  useListSocialNetworksQuery,
  useCreateSocialNetworkMutation,
  useUpdateSocialNetworkMutation,
  useDeleteSocialNetworkMutation,
} = catalogsApi;
