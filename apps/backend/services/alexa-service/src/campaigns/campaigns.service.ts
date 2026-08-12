import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

type Campaign = { id: string; name: string; [key: string]: unknown };

// BFF puro sobre HTTP — a diferencia de ideas (exclusiva de la skill),
// campañas es un concepto global de la aplicación (la web las gestiona de
// verdad: crear, asignar equipo), así que se queda solo en core-service;
// alexa-service la consume como cualquier otro cliente, sin Prisma propio
// (Fase 6 del plan). GET /campaigns de core-service ya filtra por
// pertenencia server-side — no se reimplementa ese filtro aquí.
@Injectable()
export class CampaignsService {
  private readonly coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

  async fetchCampaigns(authHeader: string): Promise<Campaign[]> {
    return this.getJson<Campaign[]>('/api/campaigns', authHeader);
  }

  // Resuelve "la campaña que dijo el usuario" a un id real — match exacto
  // primero, si no hay ninguno cae a coincidencia parcial (el usuario puede
  // decir el nombre incompleto por voz).
  async fetchCampaignByName(authHeader: string, name: string): Promise<Campaign | null> {
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
}
