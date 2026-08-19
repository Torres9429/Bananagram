import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiServiceClient, CampaignRecommendations } from '../integrations/ai-service/ai-service.client';

type Campaign = { id: string; name: string; brandId: string; [key: string]: unknown };

type CampaignMetrics = {
  summary: { posts: number; reach: number; interactions: number };
  byNetwork: { networkCode: string; engagementRate: number | null }[];
  topPost: { postId: string; network: string; date: string | null; engagementRate: number } | null;
};

type BrandScore = { score: number };

type SocialAccountRow = { active: boolean; followers: number };

// Forma que espera el Lambda real (fetchCampaigns), extraída de su código —
// ver docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md.
// score: number | null — null cuando quien pregunta es CM/Diseñador (Score
// es exclusivo de Cliente/Administrador desde Fase P2 de esta sesión;
// core-service responde 403, no se trata como error de la campaña completa).
export type EnrichedCampaign = {
  id: string;
  name: string;
  totalPosts: number;
  score: number | null;
  reach: number;
  engagement: number | null;
  // "followers" (total actual), no "followersGained" — SocialAccount.followers
  // es un contador sin historial, no hay forma de calcular una ganancia real
  // sin agregar seguimiento histórico nuevo (fuera de alcance, ver plan).
  followers: number;
  topNetwork: string | null;
  topPost: CampaignMetrics['topPost'];
};

// BFF puro sobre HTTP — a diferencia de ideas (exclusiva de la skill),
// campañas es un concepto global de la aplicación (la web las gestiona de
// verdad: crear, asignar equipo), así que se queda solo en core-service;
// alexa-service la consume como cualquier otro cliente, sin Prisma propio
// (Fase 6 del plan). GET /campaigns de core-service ya filtra por
// pertenencia server-side — no se reimplementa ese filtro aquí.
@Injectable()
export class CampaignsService {
  private readonly coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

  constructor(private readonly aiService: AiServiceClient) {}

  // fetchCampaigns real: el Lambda espera cada campaña ya compuesta con
  // score/reach/engagement/followers/topNetwork/topPost (Fase P3) — no el
  // passthrough crudo de antes. GET /campaigns de core-service se queda
  // liviano (lo usa la web), la composición vive aquí.
  async fetchCampaigns(authHeader: string): Promise<EnrichedCampaign[]> {
    const campaigns = await this.getJson<Campaign[]>('/api/campaigns', authHeader);
    return Promise.all(campaigns.map((campaign) => this.enrichCampaign(campaign, authHeader)));
  }

  private async enrichCampaign(campaign: Campaign, authHeader: string): Promise<EnrichedCampaign> {
    const [metrics, brandScore, socialAccounts] = await Promise.all([
      this.getJson<CampaignMetrics>(`/api/campaigns/${campaign.id}/metrics`, authHeader),
      // Score es exclusivo de Cliente/Administrador (Fase P2) — un CM o
      // Diseñador que use la Skill recibe 403 aquí, y eso es correcto, no
      // un error: se degrada a null en vez de tumbar fetchCampaigns entero.
      this.getJsonOrNullOn403<BrandScore>(`/api/brands/${campaign.brandId}/score`, authHeader),
      this.getJson<SocialAccountRow[]>(`/api/brands/${campaign.brandId}/social-accounts`, authHeader),
    ]);

    const followers = socialAccounts.filter((account) => account.active).reduce((sum, account) => sum + account.followers, 0);
    const topNetwork = [...metrics.byNetwork]
      .filter((network) => network.engagementRate !== null)
      .sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0))[0]?.networkCode ?? null;
    // Resumen agregado (nunca por-red, esa distinción vive en byNetwork) —
    // válido como cifra global para la skill, distinto del criterio de
    // "nunca combinar engagementRate entre redes con denominador distinto"
    // que sí aplica dentro de campaign-metrics.service.ts.
    const engagement = metrics.summary.reach > 0
      ? Math.round((metrics.summary.interactions / metrics.summary.reach) * 100 * 100) / 100
      : null;

    return {
      id: campaign.id,
      name: campaign.name,
      totalPosts: metrics.summary.posts,
      score: brandScore?.score ?? null,
      reach: metrics.summary.reach,
      engagement,
      followers,
      topNetwork,
      topPost: metrics.topPost,
    };
  }

  // Resuelve "la campaña que dijo el usuario" a un id real — match exacto
  // primero, si no hay ninguno cae a coincidencia parcial (el usuario puede
  // decir el nombre incompleto por voz).
  async fetchCampaignByName(authHeader: string, name: string): Promise<EnrichedCampaign | null> {
    const campaigns = await this.fetchCampaigns(authHeader);
    const normalized = name.trim().toLowerCase();
    const exact = campaigns.find((campaign) => campaign.name.toLowerCase() === normalized);
    if (exact) return exact;
    return campaigns.find((campaign) => campaign.name.toLowerCase().includes(normalized)) ?? null;
  }

  async fetchCampaign(authHeader: string, campaignId: string): Promise<Campaign> {
    return this.getJson<Campaign>(`/api/campaigns/${campaignId}`, authHeader);
  }

  async fetchCampaignMetrics(authHeader: string, campaignId: string): Promise<unknown> {
    return this.getJson(`/api/campaigns/${campaignId}/metrics`, authHeader);
  }

  // GetIdeaRecommendationsIntent — arma el resumen agregado que ai-service
  // necesita (campaignName + summary de metrics ya reales) y le pide
  // recomendaciones cualitativas. Mismo cálculo de engagement que
  // enrichCampaign de arriba (nunca combinar tasas de redes distintas, este
  // es un resumen agregado a propósito, no por red).
  async fetchCampaignRecommendations(authHeader: string, campaignId: string): Promise<CampaignRecommendations> {
    const [campaign, metrics] = await Promise.all([
      this.fetchCampaign(authHeader, campaignId),
      this.getJson<CampaignMetrics>(`/api/campaigns/${campaignId}/metrics`, authHeader),
    ]);

    const engagementRate =
      metrics.summary.reach > 0
        ? Math.round((metrics.summary.interactions / metrics.summary.reach) * 100 * 100) / 100
        : null;

    return this.aiService.campaignRecommendations(
      {
        campaignName: campaign.name,
        totalPosts: metrics.summary.posts,
        reach: metrics.summary.reach,
        interactions: metrics.summary.interactions,
        engagementRate,
      },
      authHeader,
    );
  }

  // Reenvía el mismo Bearer del caller — core-service valida permiso +
  // pertenencia del lado real, alexa-service no reimplementa nada de eso.
  private async getJson<T>(path: string, authHeader: string): Promise<T> {
    const response = await fetch(`${this.coreServiceUrl}${path}`, {
      headers: { Authorization: authHeader },
    });
    if (response.status === 404) {
      throw new NotFoundException('Recurso no encontrado en core-service');
    }
    if (!response.ok) {
      throw new BadRequestException(`core-service respondió ${response.status} para ${path}`);
    }
    return response.json() as Promise<T>;
  }

  // Para recursos que core-service restringe por rol a propósito (ej. Score,
  // exclusivo de Cliente/Administrador) — un 403 aquí significa "este
  // usuario no debe ver esto", no un fallo real. Cualquier otro error sigue
  // propagándose igual que getJson.
  private async getJsonOrNullOn403<T>(path: string, authHeader: string): Promise<T | null> {
    const response = await fetch(`${this.coreServiceUrl}${path}`, {
      headers: { Authorization: authHeader },
    });
    if (response.status === 403) return null;
    if (response.status === 404) {
      throw new NotFoundException('Recurso no encontrado en core-service');
    }
    if (!response.ok) {
      throw new BadRequestException(`core-service respondió ${response.status} para ${path}`);
    }
    return response.json() as Promise<T>;
  }
}
