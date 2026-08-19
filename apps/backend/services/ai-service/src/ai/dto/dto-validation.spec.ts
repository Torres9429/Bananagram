import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateIdeasDto } from './generate-ideas.dto';
import { AnalyzePostDto } from './analyze-post.dto';
import { ImprovePostDto, ImprovePostAction } from './improve-post.dto';
import { SuggestCaptionDto } from './suggest-caption.dto';
import { CampaignRecommendationsDto } from './campaign-recommendations.dto';

describe('GenerateIdeasDto', () => {
  it('rejects a body without platform', async () => {
    const dto = plainToInstance(GenerateIdeasDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platform')).toBe(true);
  });

  it('accepts a minimal valid body', async () => {
    const dto = plainToInstance(GenerateIdeasDto, { platform: 'instagram' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects more than 5 previousPosts (cost control)', async () => {
    const dto = plainToInstance(GenerateIdeasDto, {
      platform: 'instagram',
      previousPosts: Array.from({ length: 6 }, (_, i) => `post ${i}`),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'previousPosts')).toBe(true);
  });

  it('rejects quantity above 8', async () => {
    const dto = plainToInstance(GenerateIdeasDto, { platform: 'instagram', quantity: 20 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });
});

describe('AnalyzePostDto', () => {
  it('rejects a non-UUID postId', async () => {
    const dto = plainToInstance(AnalyzePostDto, { postId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'postId')).toBe(true);
  });

  it('accepts a valid postId', async () => {
    const dto = plainToInstance(AnalyzePostDto, { postId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('ImprovePostDto', () => {
  it('rejects an action outside the enum', async () => {
    const dto = plainToInstance(ImprovePostDto, {
      postId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      action: 'reescribir_todo',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'action')).toBe(true);
  });

  it('accepts a valid action', async () => {
    const dto = plainToInstance(ImprovePostDto, {
      postId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      action: ImprovePostAction.HASHTAGS,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('SuggestCaptionDto', () => {
  it('rejects a body without platform', async () => {
    const dto = plainToInstance(SuggestCaptionDto, { brief: 'una promo de verano' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platform')).toBe(true);
  });

  it('accepts brief-only (no images required)', async () => {
    const dto = plainToInstance(SuggestCaptionDto, { platform: 'instagram', brief: 'una promo de verano' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an image that is not a base64 data URL', async () => {
    const dto = plainToInstance(SuggestCaptionDto, {
      platform: 'instagram',
      images: ['https://example.com/foto.jpg'],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'images')).toBe(true);
  });

  it('rejects more than 3 images (cost control)', async () => {
    const oneByOnePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const dto = plainToInstance(SuggestCaptionDto, {
      platform: 'instagram',
      images: [oneByOnePng, oneByOnePng, oneByOnePng, oneByOnePng],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'images')).toBe(true);
  });
});

describe('CampaignRecommendationsDto', () => {
  it('rejects a body missing required numeric fields', async () => {
    const dto = plainToInstance(CampaignRecommendationsDto, { campaignName: 'Verano 2026' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totalPosts')).toBe(true);
    expect(errors.some((e) => e.property === 'reach')).toBe(true);
    expect(errors.some((e) => e.property === 'interactions')).toBe(true);
  });

  it('accepts a minimal valid body', async () => {
    const dto = plainToInstance(CampaignRecommendationsDto, {
      campaignName: 'Verano 2026',
      totalPosts: 12,
      reach: 5000,
      interactions: 300,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
