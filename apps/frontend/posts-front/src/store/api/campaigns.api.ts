import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';
import type { Campaign } from '@repo/ui/types';

// Solo lectura — posts-front necesita el selector de campaña al crear/listar
// publicaciones, pero no gestiona campañas (eso vive en brands-front). Cada
// zona de Multi-Zones es standalone (no comparten store), así que se
// duplica un slice mínimo apuntando al mismo GET /campaigns real en vez de
// importar el de brands-front — mismo criterio que ya documenta
// brands-front/src/store/api/campaigns.api.ts sobre por qué vive por zona.
export const campaignsApi = createApi({
  reducerPath: 'postsFrontCampaignsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  endpoints: (builder) => ({
    listCampaigns: builder.query<Campaign[], void>({
      query: () => 'campaigns',
    }),
  }),
});

export const { useListCampaignsQuery } = campaignsApi;
