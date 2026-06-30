import type { PostStatus } from '@repo/ui';

export interface MockCampaignSummary {
  id: string;
  name: string;
  color: string;
  progress: number;
}

export interface BrandProfile {
  id: string;
  socialNetwork: string;
}

export const MOCK_BRAND_PROFILES: BrandProfile[] = [
  { id: 'bp1', socialNetwork: 'Instagram' },
  { id: 'bp2', socialNetwork: 'Facebook' },
];

export function getBrandProfile(brandProfileId: string): BrandProfile | undefined {
  return MOCK_BRAND_PROFILES.find((p) => p.id === brandProfileId);
}

export interface MockRecentPost {
  id: string;
  title: string;
  status: PostStatus;
  brandProfileId: string;
}

// ── Dashboard compartido (CM) ─────────────────────────────────────
export const MOCK_DASHBOARD = {
  cmName: 'Ana García',
  kpis: {
    pendingReview: 2,
    activeCampaigns: 3,
    avgScore: 78,
    nextScheduled: 'Hoy · 18:00',
  },
  campaigns: [
    { id: 'c1', name: 'Lanzamiento Verano', color: '#FDC726', progress: 65 },
    { id: 'c2', name: 'Black Friday', color: '#D4AC40', progress: 30 },
    { id: 'c3', name: 'Embajadores', color: '#8F8F8F', progress: 80 },
  ] as MockCampaignSummary[],
  recentPosts: [
    { id: 'p2', title: 'Reel: detrás de cámaras', status: 'en_revision', brandProfileId: 'bp1' },
    { id: 'p5', title: 'Carrusel de producto', status: 'rechazado', brandProfileId: 'bp1' },
    { id: 'p1', title: 'Post de lanzamiento', status: 'programado', brandProfileId: 'bp2' },
  ] as MockRecentPost[],
};

export const MOCK_POSTS_BY_STATUS = [
  { status: 'Borrador', count: 4 },
  { status: 'En revisión', count: 2 },
  { status: 'Aprobado', count: 3 },
  { status: 'Programado', count: 5 },
  { status: 'Publicado', count: 12 },
];

export const MOCK_POSTS_BY_NETWORK = [
  { network: 'Instagram', count: 14, color: '#FDC726' },
  { network: 'TikTok', count: 8, color: '#D4AC40' },
  { network: 'Facebook', count: 5, color: '#8F8F8F' },
  { network: 'X', count: 3, color: '#7A5C00' },
];

// ── Dashboard Administrador ───────────────────────────────────────
export const MOCK_ADMIN_DASHBOARD = {
  users: {
    total: 6,
    active: 5,
    pendingActivation: 1,
    byRole: [
      { role: 'Community Manager', count: 2 },
      { role: 'Diseñador', count: 2 },
      { role: 'Cliente', count: 1 },
      { role: 'Admin', count: 1 },
    ],
  },
  catalogs: {
    socialNetworks: 5,
    categories: 4,
    specialties: 3,
  },
  recentAudit: [
    { id: 'a1', actor: 'Rocío Rodríguez', action: 'Rechazó publicación', date: '25 jun, 16:45' },
    { id: 'a2', actor: 'Ana García', action: 'Envió a revisión', date: '25 jun, 14:30' },
    { id: 'a3', actor: 'Marco Sosa', action: 'Creó usuario Diego Ferman', date: '20 jun, 09:30' },
  ],
};

// ── Dashboard Cliente ─────────────────────────────────────────────
export const MOCK_CLIENTE_DASHBOARD = {
  brandName: 'Zara MX',
  pendingApprovals: 2,
  activeCampaigns: 2,
  score: 82,
  scoreClassification: 'alto' as const,
  metrics24h: { reach: 4800, engagement: 5.2 },
  team: [
    { id: 'u1', name: 'Ana García', role: 'Community Manager', campaignName: 'Campaña Verano' },
    { id: 'u3', name: 'Elías Bailón', role: 'Diseñador', campaignName: 'Campaña Verano' },
    { id: 'u2', name: 'Alexa Delgado', role: 'Diseñador', campaignName: 'Nike Run Launch' },
  ],
  postsToApprove: [
    { id: 'p3', title: 'Carrusel colores SS25', status: 'en_revision' as PostStatus, brandProfileId: 'bp1', campaign: 'Campaña Verano' },
    { id: 'p4', title: 'Story promo weekend', status: 'en_revision' as PostStatus, brandProfileId: 'bp2', campaign: 'Campaña Verano' },
  ],
};

// ── Dashboard Diseñador ───────────────────────────────────────────
export const MOCK_DISENADOR_DASHBOARD = {
  designerName: 'Carlos Ruiz',
  myPosts: {
    drafts: 3,
    rejected: 1,
    published: 5,
  },
  assignedCampaigns: [
    { id: 'c1', name: 'Campaña Verano', brandName: 'Zara MX', color: '#FDC726' },
  ],
  recentPosts: [
    { id: 'p1', title: 'Post lanzamiento verano', status: 'borrador' as PostStatus, brandProfileId: 'bp1' },
    { id: 'p2', title: 'Reel Nike 30 seg', status: 'rechazado' as PostStatus, brandProfileId: 'bp1' },
  ] as MockRecentPost[],
};
