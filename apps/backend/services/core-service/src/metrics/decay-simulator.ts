/**
 * Simula métricas con curva de decaimiento temporal.
 * likes = followers × baseEngagementRate × e^(-hoursOld/48) × random[0.8–1.2]
 */
export function simulateMetrics(followers: number, baseEngagementRate: number, publishedAt: Date) {
  const hoursOld = (Date.now() - publishedAt.getTime()) / 3_600_000;
  const random = 0.8 + Math.random() * 0.4;
  const decay = Math.exp(-hoursOld / 48);
  const likes    = Math.round(followers * baseEngagementRate * decay * random);
  const comments = Math.round(likes * 0.05 * random);
  const shares   = Math.round(likes * 0.02 * random);
  const reach    = Math.round(followers * (0.1 + decay * 0.3) * random);
  const views    = Math.round(reach * (1.2 + Math.random() * 0.8)); // impresiones ≥ reach (mismo usuario puede ver más de una vez)
  const engagement = reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0;
  return { likes, comments, shares, views, reach, engagement: Math.round(engagement * 100) / 100 };
}
