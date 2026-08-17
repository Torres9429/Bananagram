import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { simulateMetrics } from '../../metrics/decay-simulator';
import {
  AccountMetrics,
  AnalyticsContext,
  NormalizedAnalytics,
  PublishResultItem,
  PublishTarget,
  SocialProvider,
} from './social-provider.interface';

// Hash chico y determinista — misma networkCode siempre da el mismo "ritmo
// de crecimiento" diario, sin necesitar guardar estado en ningún lado.
function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Envuelve decay-simulator.ts (no se toca, se reutiliza tal cual) detrás del
// mismo contrato que usaría Ayrshare real — permite seguir haciendo demos
// sin gastar el trial, alternando con SOCIAL_PROVIDER=mock|ayrshare.
@Injectable()
export class MockSocialProvider implements SocialProvider {
  async publish(_profileKey: string, _postId: string, _content: string, targets: PublishTarget[], _mediaUrls?: string[]): Promise<PublishResultItem[]> {
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

  // Crecimiento simulado, gradual y determinista (misma red = mismo ritmo
  // día a día) — así el demo se ve creciendo real sin necesitar Ayrshare ni
  // guardar estado propio: base + (días desde época) × incremento diario,
  // ambos derivados de un hash del profileKey+networkCode.
  async getAccountMetrics(profileKey: string, networkCode: string): Promise<AccountMetrics> {
    const seed = hashCode(`${profileKey}:${networkCode}`);
    const base = 50 + (seed % 200);
    const dailyGrowth = 1 + (seed % 5);
    // Ancla reciente (no época Unix) — con época, "días transcurridos" ronda
    // los 20,000 y da seguidores absurdos incluso con un incremento chico.
    const anchor = Date.UTC(2026, 0, 1);
    const daysSinceAnchor = Math.floor((Date.now() - anchor) / 86_400_000);
    const followers = base + daysSinceAnchor * dailyGrowth;
    // Resto de campos: proporción fija del follower count, mismo espíritu
    // que decay-simulator.ts (números plausibles, no aleatorios de verdad).
    return {
      followers,
      likes: Math.round(followers * 0.08),
      comments: Math.round(followers * 0.01),
      shares: Math.round(followers * 0.005),
      views: Math.round(followers * 0.6),
      reach: Math.round(followers * 0.5),
      // Sin simular — inventar una distribución de edad/género/país
      // plausible no aporta nada real y el modo simulado ya deja claro que
      // es de prueba; null aquí es honesto igual que en el proveedor real.
      audienceGenderAge: null,
      audienceCountry: null,
      source: 'simulated',
    };
  }
}
