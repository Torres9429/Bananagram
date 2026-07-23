import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class ScoreService {
  async calculate(brandId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const posts = await prisma.post.findMany({
      where: { brandId, status: 'publicado', publishedAt: { gte: thirtyDaysAgo }, deletedAt: null },
      include: { metrics: true, brandProfile: true },
    });

    // Consistencia (30%): posts en horarios pico / total posts
    const peakHours = [9, 12, 18, 20];
    const peakPosts = posts.filter(p => p.publishedAt && peakHours.includes(new Date(p.publishedAt).getHours()));
    const consistency = posts.length > 0 ? (peakPosts.length / posts.length) * 100 : 0;

    // Engagement (40%)
    const avgEngagement = posts.length > 0
      ? posts.reduce((sum, p) => sum + (p.metrics[0]?.engagementRate ?? 0), 0) / posts.length
      : 0;
    const engagement = avgEngagement <= 2 ? (avgEngagement / 2) * 50
      : avgEngagement <= 5 ? 50 + ((avgEngagement - 2) / 3) * 30
      : Math.min(100, 80 + ((avgEngagement - 5) / 5) * 20);

    // Cobertura (20%): redes con ≥1 post / total redes activas
    const activeProfiles = await prisma.brandProfile.count({ where: { brandId, active: true, deletedAt: null } });
    const networksWithPosts = new Set(posts.map(p => p.brandProfileId)).size;
    const coverage = activeProfiles > 0 ? (networksWithPosts / activeProfiles) * 100 : 0;

    // Frecuencia (10%): 100 − (desv. estándar de días entre posts × 10)
    let frequency = 50; // neutro si < 2 posts
    if (posts.length >= 2) {
      const dates = posts.map(p => p.publishedAt!.getTime()).sort();
      const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / 86_400_000);
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const std = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
      frequency = Math.max(0, 100 - std * 10);
    }

    const score = consistency * 0.30 + engagement * 0.40 + coverage * 0.20 + frequency * 0.10;
    const rounded = Math.round(score * 10) / 10;
    const classification = rounded <= 40 ? 'bajo' : rounded <= 70 ? 'medio' : 'alto';

    await prisma.brandScore.create({
      data: { brandId, score: rounded, consistency, engagement, coverage, frequency, classification },
    });

    return { score: rounded, consistency, engagement, coverage, frequency, classification };
  }
}
