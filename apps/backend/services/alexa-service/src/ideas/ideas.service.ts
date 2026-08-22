import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentIdeaSource } from '../../node_modules/.prisma-client';
import { prisma } from '../prisma/client';
import { AiServiceClient, GeneratedIdea } from '../integrations/ai-service/ai-service.client';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { UpdateIdeaDto } from './dto/update-idea.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';

type CurrentUser = { sub: string; roles: string[] };
type AccessibleCampaign = { id: string; name: string };

// Único servicio del sistema con lectura/escritura directa de ContentIdea
// (Fase 6 del plan): las ideas solo se generan desde la skill, así que
// core-service dejó de tener cualquier lógica de este dominio — este
// service es ahora el único dueño, para cualquier cliente (web o skill).
@Injectable()
export class IdeasService {
  private readonly coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

  constructor(private readonly aiService: AiServiceClient) {}

  // Filtrado por createdBy a propósito: aunque varios roles compartan acceso
  // a la misma campaña (CM, Diseñador, Cliente), las ideas guardadas son
  // personales — cada quien ve solo las suyas, no las de sus compañeros de
  // equipo en la misma campaña. Administrador es la única excepción (ve/
  // gestiona todas, mismo criterio que CampaignsService.assertCanManage en
  // core-service — ver el `roles.includes('administrador')` de ahí).
  async listByCampaign(campaignId: string, userId: string, isAdmin: boolean, authHeader: string): Promise<any> {
    await this.assertCampaignAccess(campaignId, authHeader);
    return prisma.contentIdea.findMany({
      where: { campaignId, deletedAt: null, ...(isAdmin ? {} : { createdBy: userId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIdea(id: string, userId: string, isAdmin: boolean, authHeader: string): Promise<any> {
    const idea = await prisma.contentIdea.findFirst({ where: { id, deletedAt: null } });
    if (!idea) throw new NotFoundException(`ContentIdea ${id} no existe`);
    await this.assertCampaignAccess(idea.campaignId, authHeader);
    // No se distingue "no existe" de "no es tuya" a propósito — mismo
    // criterio que assertCampaignAccess más abajo.
    if (!isAdmin && idea.createdBy !== userId) throw new NotFoundException(`ContentIdea ${id} no existe`);
    return idea;
  }

  async createIdea(dto: CreateIdeaDto, user: CurrentUser, authHeader: string): Promise<any> {
    await this.assertCampaignAccess(dto.campaignId, authHeader);
    return prisma.contentIdea.create({
      data: {
        campaignId: dto.campaignId,
        text: dto.text,
        title: dto.title,
        source: (dto.source as ContentIdeaSource) ?? ContentIdeaSource.sugerida,
        createdBy: user.sub,
      },
    });
  }

  async updateIdea(id: string, dto: UpdateIdeaDto, userId: string, isAdmin: boolean, authHeader: string): Promise<any> {
    await this.getIdea(id, userId, isAdmin, authHeader);
    this.assertAtLeastOneProvided(dto);

    return prisma.contentIdea.update({
      where: { id },
      data: { text: dto.text, title: dto.title },
    });
  }

  async removeIdea(id: string, userId: string, isAdmin: boolean, authHeader: string): Promise<any> {
    await this.getIdea(id, userId, isAdmin, authHeader);
    return prisma.contentIdea.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // deleteIdeaFromBackend del Lambda real borra por título, no por id —
  // fetchSavedIdeas ni siquiera devuelve uno (solo title/text/createdAt).
  // Si hay más de una coincidencia, borra la más reciente (mismo criterio
  // razonable que esperaría un humano pidiéndolo por voz). Acotado a las
  // ideas del propio usuario, mismo criterio que listByCampaign — evita que
  // alguien borre por voz una idea de un compañero de equipo adivinando/
  // repitiendo su título exacto (salvo Administrador).
  async removeIdeaByTitle(campaignId: string, title: string, userId: string, isAdmin: boolean, authHeader: string): Promise<any> {
    await this.assertCampaignAccess(campaignId, authHeader);

    const normalized = title.trim().toLowerCase();
    const candidates = await prisma.contentIdea.findMany({
      where: { campaignId, deletedAt: null, ...(isAdmin ? {} : { createdBy: userId }) },
      orderBy: { createdAt: 'desc' },
    });
    const match = candidates.find((idea) => idea.title?.trim().toLowerCase() === normalized);
    if (!match) {
      throw new NotFoundException(`No se encontró ninguna idea con el título "${title}" en esta campaña`);
    }

    return prisma.contentIdea.update({ where: { id: match.id }, data: { deletedAt: new Date() } });
  }

  // Cuántas ideas devuelve SIEMPRE esta llamada — fijo, no configurable por
  // el caller. SaveIdeaIntent (la skill) solo puede referenciar 3 ideas por
  // voz (su slot `ideaNumber`, tipo CustomAnswer, únicamente define "la
  // primera/segunda/tercera") — devolver otra cantidad rompería ese intent.
  private static readonly IDEAS_PER_REQUEST = 3;

  // Genera ideas nuevas vía ai-service (GenerateContentIdeasIntent) — no las
  // guarda, el Lambda decide cuál guardar después con createIdea/SaveIdeaIntent.
  // networkName llega opcional desde la skill; sin él, ai-service igual
  // necesita un `platform` (campo obligatorio de su lado), así que se cae a
  // un valor genérico en vez de inventar una red específica.
  async generateIdeas(dto: GenerateIdeasDto, authHeader: string): Promise<{ ideas: GeneratedIdea[] }> {
    const campaign = await this.assertCampaignAccess(dto.campaignId, authHeader);
    return this.aiService.generateIdeas(
      {
        platform: dto.networkName?.trim() || 'redes sociales',
        campaignId: dto.campaignId,
        brandName: campaign?.name,
        quantity: IdeasService.IDEAS_PER_REQUEST,
      },
      authHeader,
    );
  }

  // alexa-service ya no tiene Campaign en su propio Prisma Client — reutiliza
  // la regla de pertenencia que ya vive (correcta) en core-service vía HTTP,
  // en vez de reimplementarla: GET /campaigns ya filtra server-side por
  // ownership (dueño, CM, diseñador o Administrador — CampaignsService.
  // listCampaigns). Reenvía el mismo Bearer del caller para que el
  // ownership se valide como el usuario real, no como un usuario de
  // servicio genérico. Devuelve la campaña encontrada (antes solo validaba)
  // para que generateIdeas pueda reusar su `name` sin una segunda llamada.
  private async assertCampaignAccess(campaignId: string, authHeader: string): Promise<AccessibleCampaign> {
    const response = await fetch(`${this.coreServiceUrl}/api/campaigns`, {
      headers: { Authorization: authHeader },
    });
    if (!response.ok) {
      throw new BadRequestException('No se pudo verificar el acceso a la campaña');
    }

    const campaigns = (await response.json()) as AccessibleCampaign[];
    const found = campaigns.find((campaign) => campaign.id === campaignId);
    if (!found) {
      // No se distingue "no existe" de "no es tuya" a propósito — mismo
      // criterio que no filtrar existencia de recursos a quien no tiene acceso.
      throw new ForbiddenException('No tienes acceso a esta campaña');
    }
    return found;
  }

  private assertAtLeastOneProvided(dto: object): void {
    const hasAnyValue = Object.values(dto).some((value) => value !== undefined && value !== null);
    if (!hasAnyValue) {
      throw new BadRequestException('Debes enviar al menos un campo para actualizar');
    }
  }
}
