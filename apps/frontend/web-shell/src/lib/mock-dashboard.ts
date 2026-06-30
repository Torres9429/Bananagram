import type { PostStatus } from '@repo/ui';

export interface MockCampaignSummary {
  id: string;
  name: string;
  color: string;
  progress: number;
}

export interface MockRecentPost {
  id: string;
  title: string;
  status: PostStatus;
  network: string;
}

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
    { id: 'p2', title: 'Reel: detrás de cámaras', status: 'en_revision', network: 'Instagram' },
    { id: 'p5', title: 'Carrusel de producto', status: 'rechazado', network: 'Instagram' },
    { id: 'p1', title: 'Post de lanzamiento', status: 'programado', network: 'Facebook' },
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
