import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma/client';

@Injectable()
export class ScoreService {
  async calculate(brandId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    // Post (Capa 1) ya no es 1:1 con una red — el fan-out multi-red vive en
    // PostSocialAccount (Capa 2), y las métricas cuelgan de ahí (ver
    // docs/base/modelo2.txt). Un post puede publicarse en varias redes.
    const posts = await prisma.post.findMany({
      where: { brandId, status: 'publicado', publishedAt: { gte: thirtyDaysAgo }, deletedAt: null },
      include: { socialAccounts: { include: { metrics: true } } },
    });

    // Consistencia (30%): posts en horarios pico / total posts
    const peakHours = [9, 12, 18, 20];
    const peakPosts = posts.filter(p => p.publishedAt && peakHours.includes(new Date(p.publishedAt).getHours()));
    const consistency = posts.length > 0 ? (peakPosts.length / posts.length) * 100 : 0;

    // Engagement (40%): promedio de las métricas de todas las redes en las
    // que se publicó cada post (antes había una sola red por post; ahora
    // puede haber varias vía PostSocialAccount).
    const allMetrics = posts.flatMap(p => p.socialAccounts.flatMap(sa => sa.metrics));
    const avgEngagement = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + (m.engagement ?? 0), 0) / allMetrics.length
      : 0;
    const engagement = avgEngagement <= 2 ? (avgEngagement / 2) * 50
      : avgEngagement <= 5 ? 50 + ((avgEngagement - 2) / 3) * 30
      : Math.min(100, 80 + ((avgEngagement - 5) / 5) * 20);

    // Cobertura (20%): cuentas sociales con ≥1 post / total cuentas activas
    const activeAccounts = await prisma.socialAccount.count({ where: { brandId, active: true, deletedAt: null } });
    const networksWithPosts = new Set(posts.flatMap(p => p.socialAccounts.map(sa => sa.socialAccountId))).size;
    const coverage = activeAccounts > 0 ? (networksWithPosts / activeAccounts) * 100 : 0;

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
