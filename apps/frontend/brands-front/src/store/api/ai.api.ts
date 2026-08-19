import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// Consume ai-service a través del Gateway (/api/ai/*) — nunca habla con
// OpenRouter directo. Tipo de respuesta refleja el shape real de
// apps/backend/services/ai-service/src/ai/ai.service.ts (generateIdeas).

export type GeneratedIdea = {
  title: string;
  concept: string;
  hook: string;
  suggestedFormat: string;
  callToAction: string;
};

export interface GenerateIdeasRequest {
  platform: string;
  campaignId?: string;
  brandName?: string;
  category?: string;
  description?: string;
  audience?: string;
  tone?: string;
  additionalContext?: string;
  quantity?: number;
}

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: createAuthenticatedBaseQuery(),
  endpoints: (builder) => ({
    // No persiste nada — ai-service no guarda ideas en BD (fuera de alcance
    // de esta primera versión). El usuario copia lo que le sirva a mano.
    generateIdeas: builder.mutation<{ ideas: GeneratedIdea[] }, GenerateIdeasRequest>({
      query: (body) => ({ url: 'ai/generate-ideas', method: 'POST', body }),
    }),
  }),
});

export const { useGenerateIdeasMutation } = aiApi;
