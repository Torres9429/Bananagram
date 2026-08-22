import type { DateRange, NetworkSpecificMetrics, SocialMetricFact } from './analytics/types';
import type { MockBrandMetric } from '../interfaces/interface';

export const MOCK_BRAND_METRICS: MockBrandMetric[] = [
  {
    id: 'b1',
    name: 'Zara MX',
    color: '#E0A800',
    // Orden alineado a BrandScore (@repo/ui) / modelo.txt: coverage va después de
    // frequency porque es informativa, no un 4º factor ponderado (ver §1.4).
    score: { id: 'score-b1', brandId: 'b1', score: 82, consistency: 88, engagement: 80, frequency: 85, coverage: 75, classification: 'alto', snapshotDate: '28 jun' },
  },
  {
    id: 'b2',
    name: 'Nike MX',
    color: '#42A5F5',
    score: { id: 'score-b2', brandId: 'b2', score: 74, consistency: 70, engagement: 78, frequency: 72, coverage: 68, classification: 'medio', snapshotDate: '28 jun' },
  },
  {
    id: 'b3',
    name: 'Spotify MX',
    color: '#66BB6A',
    score: { id: 'score-b3', brandId: 'b3', score: 58, consistency: 55, engagement: 62, frequency: 60, coverage: 50, classification: 'medio', snapshotDate: '28 jun' },
  },
];

// ── Métricas de publicaciones (antes lib/analytics/mock-metrics.ts) ──────────
// Reutiliza los mismos ids de marca/perfil/campaña que ya existen en brands-front
// y posts-front (b1..b3, bp1..bp6, c1..c4, p1..p5) para mantener la narrativa
// consistente entre microfrontends, aunque cada uno mantiene su propia copia de
// datos (mismo patrón ya usado en el proyecto).
//
// Jerarquía respetada: Marca → SocialAccount (red) → Campaña → Publicación.
// La red social de cada fact se deriva de a qué SocialAccount pertenece (bp1 = IG, bp4 = TK, etc.),
// igual que en brands-front/posts-front — nunca es un campo independiente inventado.

export const CURRENT_RANGE: DateRange = { start: '2026-06-22', end: '2026-06-28' };
export const PREVIOUS_RANGE: DateRange = { start: '2026-06-15', end: '2026-06-21' };

export const MOCK_METRIC_FACTS: SocialMetricFact[] = [
  // ── Zara MX (b1) · Campaña Verano (c1, activa) · IG (bp1) ──────────────
  { id: 'f01', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p1', postTitle: 'Post lanzamiento verano', status: 'publicado', publishedAt: '2026-06-15', reach: 18000, views: 26000, likes: 820, comments: 64, shares: 30, followersGained: 120, engagement: 5.08 },
  { id: 'f02', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p9', postTitle: 'Carrusel verano SS25', status: 'publicado', publishedAt: '2026-06-17', reach: 21000, views: 31000, likes: 980, comments: 52, shares: 21, followersGained: 140, engagement: 4.91 },
  { id: 'f03', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-20', reach: 15500, views: 22000, likes: 640, comments: 38, shares: 18, followersGained: 90, engagement: 4.55 },
  { id: 'f04', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-24', reach: 23500, views: 33500, likes: 1105, comments: 71, shares: 40, followersGained: 160, engagement: 5.17 },
  { id: 'f05', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-27', reach: 26000, views: 37000, likes: 1240, comments: 87, shares: 34, followersGained: 175, engagement: 5.24 },

  // ── Zara MX (b1) · Campaña Verano (c1) · LinkedIn (bp2) ────────────────
  { id: 'f06', networkCode: 'linkedin', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp2', campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p3', postTitle: 'Carrusel colores SS25', status: 'publicado', publishedAt: '2026-06-16', reach: 3200, views: 4800, likes: 90, comments: 12, shares: 8, followersGained: 15, engagement: 3.44 },
  { id: 'f07', networkCode: 'linkedin', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp2', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-23', reach: 3600, views: 5100, likes: 105, comments: 14, shares: 9, followersGained: 18, engagement: 3.55 },

  // ── Zara MX (b1) · Black Friday (c4, pausada) · Facebook (bp3) ─────────
  { id: 'f08', networkCode: 'facebook', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: 'p4', postTitle: 'Story promo weekend', status: 'programado', publishedAt: '2026-06-18', reach: 9800, views: 14200, likes: 310, comments: 22, shares: 40, followersGained: 30, engagement: 3.80 },
  { id: 'f09', networkCode: 'facebook', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-25', reach: 10500, views: 15100, likes: 340, comments: 25, shares: 44, followersGained: 34, engagement: 3.90 },

  // ── Nike MX (b2) · Nike Run Launch (c2, activa) · TikTok (bp4) ─────────
  { id: 'f10', networkCode: 'tiktok', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p2', postTitle: 'Reel Nike 30 seg', status: 'rechazado', publishedAt: '2026-06-16', reach: 12000, views: 19000, likes: 540, comments: 30, shares: 60, followersGained: 55, engagement: 5.25 },
  { id: 'f11', networkCode: 'tiktok', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-19', reach: 13500, views: 21000, likes: 610, comments: 34, shares: 70, followersGained: 62, engagement: 5.29 },
  { id: 'f12', networkCode: 'tiktok', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-26', reach: 15200, views: 23500, likes: 705, comments: 41, shares: 82, followersGained: 70, engagement: 5.45 },

  // ── Nike MX (b2) · Nike Run Launch (c2) · Instagram (bp5) ──────────────
  { id: 'f13', networkCode: 'instagram', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p5', postTitle: 'Reels sustentabilidad', status: 'publicado', publishedAt: '2026-06-24', reach: 24000, views: 34000, likes: 1240, comments: 87, shares: 34, followersGained: 210, engagement: 5.67 },
  { id: 'f14', networkCode: 'instagram', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-27', reach: 25500, views: 36000, likes: 1310, comments: 92, shares: 38, followersGained: 225, engagement: 5.68 },
  { id: 'f15', networkCode: 'instagram', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp5', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-17', reach: 19800, views: 28500, likes: 985, comments: 66, shares: 27, followersGained: 165, engagement: 5.44 },

  // ── Spotify MX (b3) · Spotify Weekly (c3, finalizada) · TikTok (bp6) ───
  { id: 'f16', networkCode: 'tiktok', brandId: 'b3', brandName: 'Spotify MX', socialAccountId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: 'p11', postTitle: 'Playlist viernes', status: 'publicado', publishedAt: '2026-06-15', reach: 8600, views: 12800, likes: 380, comments: 40, shares: 65, followersGained: 45, engagement: 5.52 },
  { id: 'f17', networkCode: 'tiktok', brandId: 'b3', brandName: 'Spotify MX', socialAccountId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-20', reach: 9100, views: 13500, likes: 405, comments: 43, shares: 70, followersGained: 48, engagement: 5.58 },
  { id: 'f18', networkCode: 'tiktok', brandId: 'b3', brandName: 'Spotify MX', socialAccountId: 'bp6', campaignId: 'c3', campaignName: 'Spotify Weekly', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-26', reach: 7600, views: 11200, likes: 320, comments: 29, shares: 52, followersGained: 36, engagement: 5.28 },

  // ── Semana previa (para comparación de periodo) — mismas cuentas, menor rendimiento ──
  { id: 'f19', networkCode: 'instagram', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp1', campaignId: 'c1', campaignName: 'Campaña Verano', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-15', reach: 20500, views: 29500, likes: 950, comments: 58, shares: 25, followersGained: 130, engagement: 5.02 },
  { id: 'f20', networkCode: 'tiktok', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp4', campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-18', reach: 11000, views: 17500, likes: 480, comments: 26, shares: 50, followersGained: 45, engagement: 5.05 },
  { id: 'f21', networkCode: 'facebook', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp3', campaignId: 'c4', campaignName: 'Black Friday', postId: null, postTitle: null, status: 'publicado', publishedAt: '2026-06-19', reach: 9200, views: 13200, likes: 280, comments: 19, shares: 35, followersGained: 26, engagement: 3.63 },
];

export function getMockMetricFacts(): SocialMetricFact[] {
  return MOCK_METRIC_FACTS;
}

// ── Métricas nativas por red (antes lib/analytics/network-metrics.ts) ───────
// 1) MOCK_NETWORK_SPECIFIC_METRICS: métricas nativas por red, keyed por el id de
//    fact que ya existe arriba (f01..f21).
// 2) SUPPLEMENTAL_METRIC_FACTS: hechos adicionales (ids f22+) para X, que no
//    tiene ningún dato en MOCK_METRIC_FACTS — sin esto la pestaña de X quedaría
//    vacía. Se combina con MOCK_METRIC_FACTS en analytics.selectors.ts (selectAllMetricFacts).

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
    id: 'f22', networkCode: 'x', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp7',
    campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p20', postTitle: 'Anuncio lanzamiento verano',
    status: 'publicado', publishedAt: '2026-06-23',
    reach: 4200, views: 7800, likes: 210, comments: 34, shares: 58, followersGained: 40, engagement: 7.2,
  },
  {
    id: 'f23', networkCode: 'x', brandId: 'b1', brandName: 'Zara MX', socialAccountId: 'bp7',
    campaignId: 'c1', campaignName: 'Campaña Verano', postId: 'p21', postTitle: 'Behind the scenes SS25',
    status: 'publicado', publishedAt: '2026-06-26',
    reach: 4900, views: 9100, likes: 245, comments: 41, shares: 66, followersGained: 46, engagement: 7.2,
  },
  {
    id: 'f24', networkCode: 'x', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp8',
    campaignId: 'c2', campaignName: 'Nike Run Launch', postId: null, postTitle: null,
    status: 'publicado', publishedAt: '2026-06-18',
    reach: 3400, views: 6200, likes: 165, comments: 22, shares: 40, followersGained: 28, engagement: 6.7,
  },
  {
    id: 'f25', networkCode: 'x', brandId: 'b2', brandName: 'Nike MX', socialAccountId: 'bp8',
    campaignId: 'c2', campaignName: 'Nike Run Launch', postId: 'p22', postTitle: 'Nike Run challenge results',
    status: 'publicado', publishedAt: '2026-06-25',
    reach: 5600, views: 10200, likes: 290, comments: 48, shares: 78, followersGained: 55, engagement: 7.4,
  },
];

// ── Hora de publicación por fact (antes lib/analytics/timing-metrics.ts) ────
// Para PostingHeatMap. publishedAt en SocialMetricFact es solo fecha (YYYY-MM-DD),
// sin hora — este lookup aditivo cubre esa falta sin alterar los mocks existentes.

export const MOCK_PUBLISHED_HOUR: Record<string, number> = {
  f01: 9, f02: 18, f03: 21, f04: 12, f05: 19,
  f06: 10, f07: 14,
  f08: 20, f09: 8,
  f10: 17, f11: 21, f12: 19,
  f13: 12, f14: 20, f15: 9,
  f16: 16, f17: 21, f18: 11,
  f19: 9, f20: 17, f21: 8,
  f22: 10, f23: 19, f24: 8, f25: 20,
};

// ── Opciones de solo-etiqueta (antes lib/analytics/filter-options.ts) ───────
// NO son datos de métrica. SocialMetricFact no tiene todavía cmName/designerName/
// category/specialty — por eso AnalyticsFilterBar renderiza estos controles
// deshabilitados. Los nombres reutilizan los mismos usados en brands-front
// (MOCK_AVAILABLE_CMS/MOCK_AVAILABLE_DESIGNERS/MOCK_CATEGORIES/MOCK_SPECIALTIES)
// solo para que la UI se sienta consistente con el resto del sistema — no se
// importan entre microfrontends.

export const MOCK_CM_OPTIONS = ['Ana García', 'Diego Ferman', 'Valeria Cruz'];

export const MOCK_DESIGNER_OPTIONS = ['Alexa Delgado', 'Elías Bailón', 'Iván Soto', 'Carla Núñez'];

export const MOCK_CATEGORY_OPTIONS = ['Moda', 'Deportes', 'Entretenimiento', 'Tecnología', 'Gastronomía'];

export const MOCK_SPECIALTY_OPTIONS = ['Diseño gráfico', 'Copywriting', 'Video y edición', 'Fotografía', 'Paid media'];
