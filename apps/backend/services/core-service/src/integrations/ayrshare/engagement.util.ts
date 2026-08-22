import { MappedMetrics } from './mappers/mapper.interface';
import { NormalizedAnalytics } from './social-provider.interface';

// Auditoría §8: reach es el denominador preferido; si la red no lo expone
// (Facebook, X), cae a views. Nunca 0 como fallback silencioso — si no hay
// ningún denominador disponible, engagement queda null (no "0 interacciones").
export function computeEngagement(metrics: MappedMetrics): Pick<NormalizedAnalytics, 'engagement' | 'engagementBase'> {
  const denominator = metrics.reach ?? metrics.views;
  const engagementBase: NormalizedAnalytics['engagementBase'] = metrics.reach !== null ? 'reach' : metrics.views !== null ? 'views' : null;

  if (denominator === null || denominator <= 0) {
    return { engagement: null, engagementBase };
  }

  const interactions = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0);
  const engagement = Math.round((interactions / denominator) * 100 * 100) / 100;
  return { engagement, engagementBase };
}
