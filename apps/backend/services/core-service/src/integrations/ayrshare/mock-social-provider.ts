import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { simulateMetrics } from '../../metrics/decay-simulator';
import {
  AnalyticsContext,
  NormalizedAnalytics,
  PublishResultItem,
  PublishTarget,
  SocialProvider,
} from './social-provider.interface';

// Envuelve decay-simulator.ts (no se toca, se reutiliza tal cual) detrás del
// mismo contrato que usaría Ayrshare real — permite seguir haciendo demos
// sin gastar el trial, alternando con SOCIAL_PROVIDER=mock|ayrshare.
@Injectable()
export class MockSocialProvider implements SocialProvider {
  async publish(_profileKey: string, _postId: string, _content: string, targets: PublishTarget[]): Promise<PublishResultItem[]> {
    return targets.map((target) => ({
      socialAccountId: target.socialAccountId,
      status: 'publicado',
      socialPostId: `mock-${randomUUID()}`,
      providerStatus: 'success',
    }));
  }

  async getAnalytics(_profileKey: string, _socialPostId: string, context: AnalyticsContext): Promise<NormalizedAnalytics> {
    const m = simulateMetrics(context.followers, context.baseEngagementRate, context.publishedAt);
    return {
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      views: m.views,
      reach: m.reach,
      engagement: m.engagement,
      engagementBase: 'reach',
      raw: null,
      source: 'simulated',
    };
  }
}
