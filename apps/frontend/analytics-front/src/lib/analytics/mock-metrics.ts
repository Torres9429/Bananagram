import type { DateRange, SocialMetricFact } from './types';

// Capa NUEVA de mocks de métricas — no modifica ni reemplaza analytics-front/src/lib/mock-data.ts
// (esa página sigue funcionando exactamente igual). Reutiliza los mismos ids de marca/perfil/campaña
// que ya existen en brands-front y posts-front (b1..b3, bp1..bp6, c1..c4, p1..p5) para mantener
// la narrativa consistente entre microfrontends, aunque cada uno mantiene su propia copia de datos
// (mismo patrón ya usado en el proyecto).
//
// Jerarquía respetada: Marca → SocialAccount (red) → Campaña → Publicación.
// La red social de cada fact se deriva de a qué SocialAccount pertenece (bp1 = IG, bp4 = TK, etc.),
// igual que en brands-front/posts-front — nunca es un campo independiente inventado.

export const CURRENT_RANGE: DateRange = { start: '2026-06-22', end: '2026-06-28' };
export const PREVIOUS_RANGE: DateRange = { start: '2026-06-15', end: '2026-06-21' };

export const MOCK_METRIC_FACTS: SocialMetricFact[] = [
  // ── Zara MX (b1) · Campaña Verano (c1, activa) · IG (bp1) ──────────────
  { id: 'f01', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p1', postTitle: 'Post lanzamiento verano', status: 'publicado', publishedAt: '2026-06-15', reach: 18000, impressions: 26000, likes: 820, comments: 64, shares: 30, followersGained: 120, engagementRate: 5.08 },
  { id: 'f02', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p9', postTitle: 'Carrusel verano SS25', status: 'publicado', publishedAt: '2026-06-17', reach: 21000, impressions: 31000, likes: 980, comments: 52, shares: 21, followersGained: 140, engagementRate: 4.91 },
  { id: 'f03', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-20', reach: 15500, impressions: 22000, likes: 640, comments: 38, shares: 18, followersGained: 90, engagementRate: 4.55 },
  { id: 'f04', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-24', reach: 23500, impressions: 33500, likes: 1105, comments: 71, shares: 40, followersGained: 160, engagementRate: 5.17 },
  { id: 'f05', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-27', reach: 26000, impressions: 37000, likes: 1240, comments: 87, shares: 34, followersGained: 175, engagementRate: 5.24 },

  // ── Zara MX (b1) · Campaña Verano (c1) · LinkedIn (bp2) ────────────────
  { id: 'f06', networkCode: 'LI', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp2', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p3', postTitle: 'Carrusel colores SS25', status: 'publicado', publishedAt: '2026-06-16', reach: 3200, impressions: 4800, likes: 90, comments: 12, shares: 8, followersGained: 15, engagementRate: 3.44 },
  { id: 'f07', networkCode: 'LI', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp2', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-23', reach: 3600, impressions: 5100, likes: 105, comments: 14, shares: 9, followersGained: 18, engagementRate: 3.55 },

  // ── Zara MX (b1) · Black Friday (c4, pausada) · Facebook (bp3) ─────────
  { id: 'f08', networkCode: 'FB', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: 'p4', postTitle: 'Story promo weekend', status: 'programado', publishedAt: '2026-06-18', reach: 9800, impressions: 14200, likes: 310, comments: 22, shares: 40, followersGained: 30, engagementRate: 3.80 },
  { id: 'f09', networkCode: 'FB', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-25', reach: 10500, impressions: 15100, likes: 340, comments: 25, shares: 44, followersGained: 34, engagementRate: 3.90 },

  // ── Nike MX (b2) · Nike Run Launch (c2, activa) · TikTok (bp4) ─────────
  { id: 'f10', networkCode: 'TK', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p2', postTitle: 'Reel Nike 30 seg', status: 'rechazado', publishedAt: '2026-06-16', reach: 12000, impressions: 19000, likes: 540, comments: 30, shares: 60, followersGained: 55, engagementRate: 5.25 },
  { id: 'f11', networkCode: 'TK', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-19', reach: 13500, impressions: 21000, likes: 610, comments: 34, shares: 70, followersGained: 62, engagementRate: 5.29 },
  { id: 'f12', networkCode: 'TK', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-26', reach: 15200, impressions: 23500, likes: 705, comments: 41, shares: 82, followersGained: 70, engagementRate: 5.45 },

  // ── Nike MX (b2) · Nike Run Launch (c2) · Instagram (bp5) ──────────────
  { id: 'f13', networkCode: 'IG', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p5', postTitle: 'Reels sustentabilidad', status: 'publicado', publishedAt: '2026-06-24', reach: 24000, impressions: 34000, likes: 1240, comments: 87, shares: 34, followersGained: 210, engagementRate: 5.67 },
  { id: 'f14', networkCode: 'IG', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-27', reach: 25500, impressions: 36000, likes: 1310, comments: 92, shares: 38, followersGained: 225, engagementRate: 5.68 },
  { id: 'f15', networkCode: 'IG', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-17', reach: 19800, impressions: 28500, likes: 985, comments: 66, shares: 27, followersGained: 165, engagementRate: 5.44 },

  // ── Spotify MX (b3) · Spotify Weekly (c3, finalizada) · TikTok (bp6) ───
  { id: 'f16', networkCode: 'TK', brandId: 'b3', brandName: 'Spotify MX', brandProfileId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: 'p11', postTitle: 'Playlist viernes', status: 'publicado', publishedAt: '2026-06-15', reach: 8600, impressions: 12800, likes: 380, comments: 40, shares: 65, followersGained: 45, engagementRate: 5.52 },
  { id: 'f17', networkCode: 'TK', brandId: 'b3', brandName: 'Spotify MX', brandProfileId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-20', reach: 9100, impressions: 13500, likes: 405, comments: 43, shares: 70, followersGained: 48, engagementRate: 5.58 },
  { id: 'f18', networkCode: 'TK', brandId: 'b3', brandName: 'Spotify MX', brandProfileId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-26', reach: 7600, impressions: 11200, likes: 320, comments: 29, shares: 52, followersGained: 36, engagementRate: 5.28 },

  // ── Semana previa (para comparación de periodo) — mismas cuentas, menor rendimiento ──
  { id: 'f19', networkCode: 'IG', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-15', reach: 20500, impressions: 29500, likes: 950, comments: 58, shares: 25, followersGained: 130, engagementRate: 5.02 },
  { id: 'f20', networkCode: 'TK', brandId: 'b2', brandName: 'Nike MX', brandProfileId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-18', reach: 11000, impressions: 17500, likes: 480, comments: 26, shares: 50, followersGained: 45, engagementRate: 5.05 },
  { id: 'f21', networkCode: 'FB', brandId: 'b1', brandName: 'Zara MX', brandProfileId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-19', reach: 9200, impressions: 13200, likes: 280, comments: 19, shares: 35, followersGained: 26, engagementRate: 3.63 },
];

export function getMockMetricFacts(): SocialMetricFact[] {
  return MOCK_METRIC_FACTS;
}
