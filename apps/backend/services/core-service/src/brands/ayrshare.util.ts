import { InternalServerErrorException } from '@nestjs/common';

export type AyrshareErrorPayload = { message?: string; code?: number; status?: string };

export type AyrshareConfig = { apiKey: string; domain: string; privateKey: string; baseUrl: string };

// Compartido entre BrandsService (crear perfil + connect URL + rollback) y
// SocialAccountsService (sync de redes conectadas) — evita leer las mismas
// 4 env vars en 2 lugares.
export function getAyrshareConfig(): AyrshareConfig {
  const apiKey = process.env.AYRSHARE_API_KEY;
  const domain = process.env.AYRSHARE_DOMAIN;
  const privateKey = process.env.AYRSHARE_PRIVATE_KEY
    ? Buffer.from(process.env.AYRSHARE_PRIVATE_KEY, 'base64').toString('utf8')
    : undefined;
  const baseUrl = process.env.AYRSHARE_API_BASE_URL;

  // Env var faltante = error de configuración del servidor, no una petición
  // mal formada del cliente — por eso 500 y no 400.
  if (!apiKey) {
    throw new InternalServerErrorException('Falta configurar AYRSHARE_API_KEY');
  }
  if (!domain) {
    throw new InternalServerErrorException('Falta configurar AYRSHARE_DOMAIN');
  }
  if (!privateKey) {
    throw new InternalServerErrorException('Falta configurar AYRSHARE_PRIVATE_KEY');
  }
  if (!baseUrl) {
    throw new InternalServerErrorException('Falta configurar AYRSHARE_API_BASE_URL');
  }

  return { apiKey, domain, privateKey, baseUrl };
}

export function getAyrshareErrorMessage(payload: AyrshareErrorPayload, fallback: string): string {
  const prefix = payload.code ? `Ayrshare ${payload.code}: ` : '';
  return `${prefix}${payload.message ?? fallback}`;
}
