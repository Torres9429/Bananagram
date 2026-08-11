import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { Brand } from '@repo/ui/types';

// Solo lectura, a propósito: esta fase conecta campañas, que necesitan un
// brandId real para funcionar, pero no reconstruye toda la UI de gestión de
// Marcas (eso queda fuera de alcance — ver plan de integración).
export const brandsApi = createApi({
  reducerPath: 'brandsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  endpoints: (builder) => ({
    // GET /brands ya viene filtrado por el backend (dueño, CM/diseñador
    // asignado a alguna campaña de la marca, o Admin ve todas).
    listMyBrands: builder.query<Brand[], void>({
      query: () => 'brands',
    }),
    getBrand: builder.query<Brand, string>({
      query: (id) => `brands/${id}`,
    }),
  }),
});

export const { useListMyBrandsQuery, useGetBrandQuery } = brandsApi;
