import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';

export type GeneratedIdea = {
  title: string;
  concept: string;
  hook: string;
  suggestedFormat: string;
  callToAction: string;
};

export type CampaignRecommendations = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

// BFF puro sobre HTTP, mismo patrón que campaigns.service.ts contra
// core-service: reenvía el Bearer del caller tal cual — ai-service vuelve a
// correr JwtAuthGuard + PermissionGuard sobre ese mismo token, acá no se
// duplica ningún chequeo de permiso. Sin circuit breaker a propósito: es el
// mismo criterio que ya usa alexa-service para sus otras llamadas internas
// contra core-service (el breaker es para APIs externas de terceros tipo
// Ayrshare/OpenRouter, no para servicios propios del backend).
@Injectable()
export class AiServiceClient {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3005';

  async generateIdeas(
    body: { platform: string; campaignId?: string; brandName?: string; quantity?: number },
    authHeader: string,
  ): Promise<{ ideas: GeneratedIdea[] }> {
    return this.postJson('/api/ai/generate-ideas', body, authHeader);
  }

  async campaignRecommendations(
    body: { campaignName: string; totalPosts: number; reach: number; interactions: number; engagementRate?: number | null },
    authHeader: string,
  ): Promise<CampaignRecommendations> {
    return this.postJson('/api/ai/campaign-recommendations', body, authHeader);
  }

  private async postJson<T>(path: string, body: unknown, authHeader: string): Promise<T> {
    const response = await fetch(`${this.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.status === 400) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      const message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      throw new BadRequestException(message ?? 'Solicitud inválida a ai-service');
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new InternalServerErrorException(payload.message ?? `ai-service respondió ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
