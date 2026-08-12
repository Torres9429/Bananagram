import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { CampaignMetricsService } from '../services/core-service/src/campaigns/campaign-metrics.service';
import { CampaignsModule } from '../services/core-service/src/campaigns/campaigns.module';
import { prisma as corePrisma } from '../services/core-service/src/prisma/client';
import { cleanDatabase } from './helpers/db.helper';

// Integración real contra Postgres — cubre exactamente los 2 hallazgos de
// mayor impacto de la auditoría §8/§22.9/§22.16: (1) agregar solo la ÚLTIMA
// captura por PostSocialAccount, nunca sumar todo el histórico; (2) reach
// null (no medido) no debe romper ni falsear el engagementRate — cae a
// views como denominador, nunca a 0 silencioso.
describe('Campaign Metrics Aggregation', () => {
  let campaignMetricsService: CampaignMetricsService;

  const ownerUserId = randomUUID();
  const cmUserId = randomUUID();

  let campaignId: string;
  let instagramCode: string;
  let facebookCode: string;

  beforeAll(async () => {
    await cleanDatabase();

    const brand = await corePrisma.brand.create({
      data: { name: 'Marca métricas', slug: `marca-metricas-${randomUUID()}`, ownerId: ownerUserId },
    });

    const campaign = await corePrisma.campaign.create({
      data: { brandId: brand.id, name: 'Campaña métricas', cmId: cmUserId, createdBy: ownerUserId },
    });
    campaignId = campaign.id;

    instagramCode = `instagram-metrics-${randomUUID()}`;
    const instagram = await corePrisma.socialNetwork.create({
      data: { name: 'Instagram', code: instagramCode, baseEngagementRate: 0.1 },
    });
    facebookCode = `facebook-metrics-${randomUUID()}`;
    const facebook = await corePrisma.socialNetwork.create({
      data: { name: 'Facebook', code: facebookCode, baseEngagementRate: 0.08 },
    });

    const instagramAccount = await corePrisma.socialAccount.create({
      data: { brandId: brand.id, socialNetworkId: instagram.id, active: true },
    });
    const facebookAccount = await corePrisma.socialAccount.create({
      data: { brandId: brand.id, socialNetworkId: facebook.id, active: true },
    });

    // Post 1: publicado en Instagram, con 2 capturas históricas — solo la
    // última (likes=20) debe contar, nunca la suma de ambas (30).
    const post1 = await corePrisma.post.create({
      data: { brandId: brand.id, campaignId, content: 'Post 1', status: 'publicado', createdBy: cmUserId },
    });
    const psa1 = await corePrisma.postSocialAccount.create({
      data: { postId: post1.id, socialAccountId: instagramAccount.id, status: 'publicado' },
    });
    await corePrisma.postMetric.create({
      data: {
        postSocialAccountId: psa1.id,
        likes: 10,
        comments: 1,
        shares: 0,
        views: 100,
        reach: 100,
        engagement: 11,
        capturedAt: new Date(Date.now() - 6 * 3600 * 1000),
      },
    });
    await corePrisma.postMetric.create({
      data: {
        postSocialAccountId: psa1.id,
        likes: 20,
        comments: 2,
        shares: 1,
        views: 150,
        reach: 150,
        engagement: 15.33,
        capturedAt: new Date(),
      },
    });

    // Post 2: publicado en Facebook, sin reach (null, la red no lo expone) —
    // el engagementRate de esta red debe caer a views como denominador.
    const post2 = await corePrisma.post.create({
      data: { brandId: brand.id, campaignId, content: 'Post 2', status: 'publicado', createdBy: cmUserId },
    });
    const psa2 = await corePrisma.postSocialAccount.create({
      data: { postId: post2.id, socialAccountId: facebookAccount.id, status: 'publicado' },
    });
    await corePrisma.postMetric.create({
      data: { postSocialAccountId: psa2.id, likes: 5, comments: 0, shares: 0, views: 200, reach: null, engagement: null },
    });

    // Post 3: falló al publicar en Instagram — cuenta en failedDeliveries,
    // nunca genera PostMetric (coverage debe reflejar esto como incompleto).
    const post3 = await corePrisma.post.create({
      data: { brandId: brand.id, campaignId, content: 'Post 3', status: 'error', createdBy: cmUserId },
    });
    await corePrisma.postSocialAccount.create({
      data: { postId: post3.id, socialAccountId: instagramAccount.id, status: 'error' },
    });

    const moduleRef = await Test.createTestingModule({ imports: [CampaignsModule] }).compile();
    campaignMetricsService = moduleRef.get(CampaignMetricsService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await corePrisma.$disconnect();
  });

  it('cuenta posts internos y entregas externas por separado', async () => {
    const metrics = await campaignMetricsService.getCampaignMetrics(campaignId);
    expect(metrics.summary.posts).toBe(3);
    expect(metrics.summary.externalDeliveries).toBe(3);
    expect(metrics.summary.successfulDeliveries).toBe(2);
    expect(metrics.summary.failedDeliveries).toBe(1);
  });

  it('usa solo la última captura por PostSocialAccount, no la suma del histórico', async () => {
    const metrics = await campaignMetricsService.getCampaignMetrics(campaignId);
    const instagram = metrics.byNetwork.find((network) => network.networkCode === instagramCode);
    expect(instagram).toBeDefined();
    // Si sumara ambas capturas de psa1 sería 30 — debe ser 20 (solo la última).
    expect(instagram!.likes).toBe(20);
    expect(instagram!.comments).toBe(2);
    expect(instagram!.shares).toBe(1);
  });

  it('reach null cae a views como denominador del engagementRate, nunca a 0 silencioso', async () => {
    const metrics = await campaignMetricsService.getCampaignMetrics(campaignId);
    const facebook = metrics.byNetwork.find((network) => network.networkCode === facebookCode);
    expect(facebook).toBeDefined();
    expect(facebook!.reach).toBe(0);
    expect(facebook!.engagementRate).toBeCloseTo((5 / 200) * 100, 2);
  });

  it('dataStatus marca cobertura incompleta y lista la red con una entrega sin métricas', async () => {
    const metrics = await campaignMetricsService.getCampaignMetrics(campaignId);
    expect(metrics.dataStatus.partial).toBe(true);
    expect(metrics.dataStatus.coveragePercentage).toBeLessThan(100);
    expect(metrics.dataStatus.missingNetworks).toContain(instagramCode);
    expect(metrics.dataStatus.missingNetworks).not.toContain(facebookCode);
  });

  it('nunca combina engagementRate entre redes en el resumen general', async () => {
    const metrics = await campaignMetricsService.getCampaignMetrics(campaignId);
    expect(metrics.summary).not.toHaveProperty('engagementRate');
  });
});
