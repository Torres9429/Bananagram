import { CampaignsService } from './campaigns.service';
import { AiServiceClient } from '../integrations/ai-service/ai-service.client';

// Solo prueba fetchCampaignRecommendations — el resto de CampaignsService es
// un passthrough BFF ya cubierto conceptualmente por el mismo patrón que
// ideas.service.spec.ts (fetch mockeado); no se repite aquí para no
// duplicar cobertura sin agregar nada nuevo.
describe('CampaignsService.fetchCampaignRecommendations', () => {
  const originalFetch = global.fetch;
  let aiService: jest.Mocked<AiServiceClient>;
  let service: CampaignsService;

  beforeEach(() => {
    aiService = { generateIdeas: jest.fn(), campaignRecommendations: jest.fn() } as unknown as jest.Mocked<AiServiceClient>;
    service = new CampaignsService(aiService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('computes an aggregate engagement rate from real metrics and forwards it to ai-service', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith('/metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ summary: { posts: 10, reach: 1000, interactions: 150 }, byNetwork: [], topPost: null }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ id: 'campaign-1', name: 'Verano 2026', brandId: 'brand-1' }) });
    }) as unknown as typeof fetch;

    aiService.campaignRecommendations.mockResolvedValue({
      summary: 'ok',
      strengths: [],
      weaknesses: [],
      recommendations: [],
    });

    await service.fetchCampaignRecommendations('Bearer token', 'campaign-1');

    expect(aiService.campaignRecommendations).toHaveBeenCalledWith(
      { campaignName: 'Verano 2026', totalPosts: 10, reach: 1000, interactions: 150, engagementRate: 15 },
      'Bearer token',
    );
  });

  it('reports null engagement when reach is 0 (never divide by zero)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith('/metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ summary: { posts: 0, reach: 0, interactions: 0 }, byNetwork: [], topPost: null }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ id: 'campaign-1', name: 'Nueva', brandId: 'brand-1' }) });
    }) as unknown as typeof fetch;

    aiService.campaignRecommendations.mockResolvedValue({ summary: 'ok', strengths: [], weaknesses: [], recommendations: [] });

    await service.fetchCampaignRecommendations('Bearer token', 'campaign-1');

    expect(aiService.campaignRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ engagementRate: null }),
      'Bearer token',
    );
  });
});
