import type { NetworkSpecificMetrics, SocialMetricFact } from './types';

// Capa NUEVA de datos (Fase 3) — NO modifica mock-metrics.ts (Fase 1). Aporta:
//  1) MOCK_NETWORK_SPECIFIC_METRICS: métricas nativas por red, keyed por el id de
//     fact que ya existe en mock-metrics.ts (f01..f21).
//  2) SUPPLEMENTAL_METRIC_FACTS: hechos adicionales (ids f22+) para X, que hoy no
//     tiene ningún dato en mock-metrics.ts — sin esto la pestaña de X quedaría
//     vacía, lo cual se pidió evitar explícitamente. Se combina con
//     MOCK_METRIC_FACTS en analytics.selectors.ts (selectAllMetricFacts).

export const MOCK_NETWORK_SPECIFIC_METRICS: Record<string, NetworkSpecificMetrics> = {
  // Instagram — Zara MX (Campaña Verano)
  f01: { profileVisits: 620, saves: 210, storyReplies: 18, storyExits: 340, storyTaps: 890 },
  f02: { profileVisits: 710, saves: 260, storyReplies: 22, storyExits: 380, storyTaps: 960 },
  f03: { profileVisits: 540, saves: 175, storyReplies: 14, storyExits: 300, storyTaps: 780 },
  f04: { profileVisits: 790, saves: 310, storyReplies: 26, storyExits: 410, storyTaps: 1050 },
  f05: { profileVisits: 880, saves: 350, storyReplies: 30, storyExits: 450, storyTaps: 1150 },
  f19: { profileVisits: 690, saves: 250, storyReplies: 21, storyExits: 360, storyTaps: 910 },

  // Instagram — Nike MX (Nike Run Launch)
  f13: { profileVisits: 820, saves: 300, storyReplies: 27, storyExits: 400, storyTaps: 1020 },
  f14: { profileVisits: 860, saves: 330, storyReplies: 29, storyExits: 430, storyTaps: 1090 },
  f15: { profileVisits: 670, saves: 240, storyReplies: 20, storyExits: 350, storyTaps: 900 },

  // LinkedIn — Zara MX
  f06: { ctr: 1.8, clicks: 58, reactions: 90 },
  f07: { ctr: 2.1, clicks: 76, reactions: 105 },

  // Facebook — Zara MX (Black Friday)
  f08: { reactions: 310, linkClicks: 145 },
  f09: { reactions: 340, linkClicks: 165 },
  f21: { reactions: 280, linkClicks: 120 },

  // TikTok — Nike MX
  f10: { watchTimeSeconds: 48000, avgWatchTimeSeconds: 22, completionRate: 46.5, favorites: 140 },
  f11: { watchTimeSeconds: 54000, avgWatchTimeSeconds: 24, completionRate: 48.2, favorites: 158 },
  f12: { watchTimeSeconds: 61000, avgWatchTimeSeconds: 25, completionRate: 50.1, favorites: 175 },
  f20: { watchTimeSeconds: 43000, avgWatchTimeSeconds: 21, completionRate: 44.0, favorites: 128 },

  // TikTok — Spotify MX
  f16: { watchTimeSeconds: 34000, avgWatchTimeSeconds: 19, completionRate: 41.0, favorites: 95 },
  f17: { watchTimeSeconds: 36500, avgWatchTimeSeconds: 20, completionRate: 43.5, favorites: 102 },
  f18: { watchTimeSeconds: 30000, avgWatchTimeSeconds: 18, completionRate: 39.8, favorites: 84 },

  // X — Zara MX (nuevo, ver SUPPLEMENTAL_METRIC_FACTS)
  f22: { replies: 34, quotes: 12, reposts: 58, bookmarks: 46, profileVisits: 210 },
  f23: { replies: 41, quotes: 15, reposts: 66, bookmarks: 52, profileVisits: 235 },

  // X — Nike MX
  f24: { replies: 22, quotes: 9, reposts: 40, bookmarks: 30, profileVisits: 150 },
  f25: { replies: 48, quotes: 19, reposts: 78, bookmarks: 61, profileVisits: 260 },
};

export const SUPPLEMENTAL_METRIC_FACTS: SocialMetricFact[] = [
  {
    id: 'f22', networkCode: 'X', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp7',
    campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p20', postTitle: 'Anuncio lanzamiento verano',
    status: 'publicado', publishedAt: '2026-06-23',
    reach: 4200, impressions: 7800, likes: 210, comments: 34, shares: 58, followersGained: 40, engagementRate: 7.2,
  },
  {
    id: 'f23', networkCode: 'X', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp7',
    campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p21', postTitle: 'Behind the scenes SS25',
    status: 'publicado', publishedAt: '2026-06-26',
    reach: 4900, impressions: 9100, likes: 245, comments: 41, shares: 66, followersGained: 46, engagementRate: 7.2,
  },
  {
    id: 'f24', networkCode: 'X', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp8',
    campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null,
    status: 'publicado', publishedAt: '2026-06-18',
    reach: 3400, impressions: 6200, likes: 165, comments: 22, shares: 40, followersGained: 28, engagementRate: 6.7,
  },
  {
    id: 'f25', networkCode: 'X', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp8',
    campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p22', postTitle: 'Nike Run challenge results',
    status: 'publicado', publishedAt: '2026-06-25',
    reach: 5600, impressions: 10200, likes: 290, comments: 48, shares: 78, followersGained: 55, engagementRate: 7.4,
  },
];
