import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AiService } from './ai.service';
import { OpenRouterClient } from './openrouter.client';
import { CoreServiceClient } from './core-service.client';
import { ImprovePostAction } from './dto/improve-post.dto';

describe('AiService', () => {
  let openRouter: jest.Mocked<OpenRouterClient>;
  let coreService: jest.Mocked<CoreServiceClient>;
  let service: AiService;

  beforeEach(() => {
    openRouter = { chatCompletion: jest.fn() } as unknown as jest.Mocked<OpenRouterClient>;
    coreService = { fetchPostContext: jest.fn() } as unknown as jest.Mocked<CoreServiceClient>;
    service = new AiService(openRouter, coreService);
  });

  describe('generateIdeas', () => {
    it('parses a valid structured response into { ideas }', async () => {
      openRouter.chatCompletion.mockResolvedValue(
        JSON.stringify({
          ideas: [
            { title: 'Reto semanal', concept: 'Un reto de 7 días', hook: '¿Te atreves?', suggestedFormat: 'reel', callToAction: 'Comenta tu avance' },
          ],
        }),
      );

      const result = await service.generateIdeas({ platform: 'instagram', quantity: 1 } as any);

      expect(result.ideas).toHaveLength(1);
      expect(result.ideas[0].title).toBe('Reto semanal');
      expect(openRouter.chatCompletion).toHaveBeenCalledTimes(1);
    });

    it('tolerates a response wrapped in a ```json code fence', async () => {
      openRouter.chatCompletion.mockResolvedValue(
        '```json\n{"ideas":[{"title":"A","concept":"B","hook":"C","suggestedFormat":"D","callToAction":"E"}]}\n```',
      );

      const result = await service.generateIdeas({ platform: 'instagram' } as any);
      expect(result.ideas).toHaveLength(1);
    });

    // Caso real verificado en vivo (2026-08-18): el modelo gratis a veces
    // agrega una frase antes del JSON pese a la instrucción del system
    // prompt ("Aquí tienes las ideas: {...}") — parseJsonResponse debe
    // recortar al primer '{'/último '}' antes de rendirse.
    it('tolerates a response with explanatory prose wrapped around the JSON', async () => {
      openRouter.chatCompletion.mockResolvedValue(
        'Aquí tienes las ideas solicitadas:\n{"ideas":[{"title":"A","concept":"B","hook":"C","suggestedFormat":"D","callToAction":"E"}]}\n¡Espero que te sirvan!',
      );

      const result = await service.generateIdeas({ platform: 'instagram' } as any);
      expect(result.ideas).toHaveLength(1);
      expect(result.ideas[0].title).toBe('A');
    });

    it('rejects a response that is not valid JSON', async () => {
      openRouter.chatCompletion.mockResolvedValue('esto no es JSON');
      await expect(service.generateIdeas({ platform: 'instagram' } as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('rejects a response missing the ideas[] shape', async () => {
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ notIdeas: true }));
      await expect(service.generateIdeas({ platform: 'instagram' } as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('analyzePost', () => {
    const postContext = {
      id: 'p1',
      content: 'Nuestro nuevo producto ya está aquí',
      status: 'en_revision',
      platforms: ['Instagram'],
      imageUrl: null,
    };

    it('fetches the real post via CoreServiceClient before calling OpenRouter (no trusting client-supplied caption)', async () => {
      coreService.fetchPostContext.mockResolvedValue(postContext as any);
      openRouter.chatCompletion.mockResolvedValue(
        JSON.stringify({ score: 70, summary: 'Bien', strengths: ['claro'], weaknesses: [], recommendations: [], hashtagAnalysis: 'ok' }),
      );

      const result = await service.analyzePost({ postId: 'p1' } as any, 'Bearer token123');

      expect(coreService.fetchPostContext).toHaveBeenCalledWith('p1', 'Bearer token123');
      expect(result.score).toBe(70);
    });

    it('propagates ForbiddenException from CoreServiceClient (post the caller cannot access) without calling OpenRouter', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      coreService.fetchPostContext.mockRejectedValue(new ForbiddenException('No tienes permiso'));

      await expect(service.analyzePost({ postId: 'p1' } as any, 'Bearer token123')).rejects.toThrow(
        ForbiddenException,
      );
      expect(openRouter.chatCompletion).not.toHaveBeenCalled();
    });

    it('rejects a response missing required fields', async () => {
      coreService.fetchPostContext.mockResolvedValue(postContext as any);
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ summary: 'incompleto' }));

      await expect(service.analyzePost({ postId: 'p1' } as any, 'Bearer token123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('improvePost', () => {
    const postContext = {
      id: 'p1',
      content: 'Caption original',
      status: 'borrador',
      platforms: ['TikTok'],
      imageUrl: null,
    };

    it('returns the improved caption alongside the original (never overwrites the post itself)', async () => {
      coreService.fetchPostContext.mockResolvedValue(postContext as any);
      openRouter.chatCompletion.mockResolvedValue(
        JSON.stringify({ improved: 'Caption mejorado', changes: ['más claro'] }),
      );

      const result = await service.improvePost({ postId: 'p1', action: ImprovePostAction.MEJORAR } as any, 'Bearer token123');

      expect(result.original).toBe('Caption original');
      expect(result.improved).toBe('Caption mejorado');
    });

    it('rejects a response without the required improved/changes fields', async () => {
      coreService.fetchPostContext.mockResolvedValue(postContext as any);
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ suggestedHashtags: ['#promo'] }));

      await expect(
        service.improvePost({ postId: 'p1', action: ImprovePostAction.HASHTAGS } as any, 'Bearer token123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('suggestCaption', () => {
    it('rejects when neither brief nor images are provided, without calling OpenRouter', async () => {
      await expect(service.suggestCaption({ platform: 'instagram' } as any)).rejects.toThrow(BadRequestException);
      expect(openRouter.chatCompletion).not.toHaveBeenCalled();
    });

    it('returns suggestions for a brief-only request (no image, no postId/core-service call)', async () => {
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ suggestions: ['Opción 1', 'Opción 2'] }));

      const result = await service.suggestCaption({ platform: 'instagram', brief: 'promo de verano' } as any);

      expect(result.suggestions).toEqual(['Opción 1', 'Opción 2']);
      expect(coreService.fetchPostContext).not.toHaveBeenCalled();
    });

    it('includes each provided image as a vision content block', async () => {
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ suggestions: ['Opción 1'] }));

      await service.suggestCaption({
        platform: 'instagram',
        images: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
      } as any);

      const [messages] = openRouter.chatCompletion.mock.calls[0];
      const userMessage = messages.find((m) => m.role === 'user')!;
      expect(Array.isArray(userMessage.content)).toBe(true);
      const imageBlocks = (userMessage.content as any[]).filter((b) => b.type === 'image_url');
      expect(imageBlocks).toHaveLength(2);
    });

    it('rejects a response missing the suggestions[] shape', async () => {
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ notSuggestions: true }));

      await expect(
        service.suggestCaption({ platform: 'instagram', brief: 'promo' } as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('campaignRecommendations', () => {
    it('parses a valid structured response, without calling core-service (no postId involved)', async () => {
      openRouter.chatCompletion.mockResolvedValue(
        JSON.stringify({
          summary: 'La campaña tiene buen alcance pero poca interacción.',
          strengths: ['Alcance consistente'],
          weaknesses: ['Baja tasa de interacción'],
          recommendations: ['Agregar más CTAs claros'],
        }),
      );

      const result = await service.campaignRecommendations({
        campaignName: 'Verano 2026',
        totalPosts: 12,
        reach: 5000,
        interactions: 150,
      } as any);

      expect(result.summary).toContain('alcance');
      expect(result.recommendations).toHaveLength(1);
      expect(coreService.fetchPostContext).not.toHaveBeenCalled();
    });

    it('rejects a response missing the required fields', async () => {
      openRouter.chatCompletion.mockResolvedValue(JSON.stringify({ summary: 'incompleto' }));

      await expect(
        service.campaignRecommendations({ campaignName: 'X', totalPosts: 1, reach: 1, interactions: 1 } as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
