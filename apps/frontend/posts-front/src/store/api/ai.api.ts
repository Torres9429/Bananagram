import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// Consume ai-service a través del Gateway (/api/ai/*) — nunca habla con
// OpenRouter directo. Tipos de respuesta reflejan el shape real de
// apps/backend/services/ai-service/src/ai/ai.service.ts.

export type AnalyzePostResult = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  hashtagAnalysis: string;
  visualRecommendations?: string[];
};

export type ImprovePostAction = 'mejorar' | 'variantes' | 'hashtags' | 'adaptar';

export type ImprovePostResult = {
  original: string;
  improved: string;
  changes: string[];
  suggestedHashtags?: string[];
  variants?: string[];
};

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: createAuthenticatedBaseQuery(),
  endpoints: (builder) => ({
    // Solo lectura sobre el post (publicaciones:ver en backend) — no
    // invalida el tag 'Post' de postsApi porque no modifica la publicación.
    analyzePost: builder.mutation<AnalyzePostResult, { postId: string; additionalContext?: string }>({
      query: (body) => ({ url: 'ai/analyze-post', method: 'POST', body }),
    }),
    // Tampoco invalida 'Post': solo propone un texto, el usuario decide si
    // lo aplica vía el flujo de edición normal (updatePost de postsApi).
    improvePost: builder.mutation<
      ImprovePostResult,
      { postId: string; action: ImprovePostAction; targetPlatform?: string; additionalContext?: string }
    >({
      query: (body) => ({ url: 'ai/improve-post', method: 'POST', body }),
    }),
    // Para posts/new: la publicación todavía no existe, por eso no hay
    // postId — `images` van como data URL base64 (los archivos son locales,
    // no se subieron a Cloudinary todavía).
    suggestCaption: builder.mutation<{ suggestions: string[] }, { platform: string; brief?: string; images?: string[] }>({
      query: (body) => ({ url: 'ai/suggest-caption', method: 'POST', body }),
    }),
  }),
});

export const { useAnalyzePostMutation, useImprovePostMutation, useSuggestCaptionMutation } = aiApi;
