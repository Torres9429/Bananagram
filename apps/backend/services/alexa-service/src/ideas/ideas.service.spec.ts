import { ForbiddenException } from '@nestjs/common';
import { IdeasService } from './ideas.service';
import { AiServiceClient } from '../integrations/ai-service/ai-service.client';

// Solo prueba generateIdeas — el resto de IdeasService toca Prisma
// directo (ContentIdea), fuera de alcance de un test unitario liviano
// (esos casos, si se prueban, van al paquete de integración con Postgres
// real, apps/backend/test/).
describe('IdeasService.generateIdeas', () => {
  const originalFetch = global.fetch;
  let aiService: jest.Mocked<AiServiceClient>;
  let service: IdeasService;

  beforeEach(() => {
    aiService = { generateIdeas: jest.fn(), campaignRecommendations: jest.fn() } as unknown as jest.Mocked<AiServiceClient>;
    service = new IdeasService(aiService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects when the caller has no access to the campaign, without calling ai-service', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'other-campaign', name: 'Otra' }],
    }) as unknown as typeof fetch;

    await expect(
      service.generateIdeas({ campaignId: 'campaign-1' } as any, 'Bearer token'),
    ).rejects.toThrow(ForbiddenException);
    expect(aiService.generateIdeas).not.toHaveBeenCalled();
  });

  it('forwards the campaign name and falls back to a generic platform when networkName is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'campaign-1', name: 'Verano 2026' }],
    }) as unknown as typeof fetch;
    aiService.generateIdeas.mockResolvedValue({ ideas: [] });

    await service.generateIdeas({ campaignId: 'campaign-1' } as any, 'Bearer token');

    expect(aiService.generateIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'redes sociales', campaignId: 'campaign-1', brandName: 'Verano 2026' }),
      'Bearer token',
    );
  });

  it('always requests exactly 3 ideas — SaveIdeaIntent can only reference "primera/segunda/tercera" by voice', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'campaign-1', name: 'Verano 2026' }],
    }) as unknown as typeof fetch;
    aiService.generateIdeas.mockResolvedValue({ ideas: [] });

    // Aunque el caller mande otro valor de quantity, el DTO real ya no
    // tiene ese campo (ValidationPipe lo descarta) — se simula ese
    // descarte pasando el dto sin quantity, como llegaría en producción.
    await service.generateIdeas({ campaignId: 'campaign-1' } as any, 'Bearer token');

    expect(aiService.generateIdeas).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 }), 'Bearer token');
  });

  it('uses the networkName slot as platform when provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'campaign-1', name: 'Verano 2026' }],
    }) as unknown as typeof fetch;
    aiService.generateIdeas.mockResolvedValue({ ideas: [] });

    await service.generateIdeas({ campaignId: 'campaign-1', networkName: 'tiktok' } as any, 'Bearer token');

    expect(aiService.generateIdeas).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'tiktok' }),
      'Bearer token',
    );
  });
});
