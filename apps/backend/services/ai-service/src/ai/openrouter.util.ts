import { InternalServerErrorException } from '@nestjs/common';

export type OpenRouterConfig = { apiKey: string; model: string; baseUrl: string };

// Mismo criterio que core-service/src/brands/ayrshare.util.ts: env faltante
// es un error de configuración del servidor (500), no un 400 del usuario.
export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) throw new InternalServerErrorException('Falta configurar OPENROUTER_API_KEY');
  if (!model) throw new InternalServerErrorException('Falta configurar OPENROUTER_MODEL');

  return { apiKey, model, baseUrl: 'https://openrouter.ai/api/v1' };
}

export function getOpenRouterErrorMessage(payload: { message?: string; error?: { message?: string; code?: unknown } }, fallback: string): string {
  const message = payload.error?.message ?? payload.message;
  const code = payload.error?.code;
  const prefix = code ? `OpenRouter ${code}: ` : '';
  return `${prefix}${message ?? fallback}`;
}
