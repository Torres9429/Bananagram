import type { BrandScore } from '@repo/ui';

export interface MockEngagementPoint {
  day: string;
  engagement: number;
  reach: number;
}

export interface MockBrandMetric {
  id: string;
  name: string;
  color: string;
  score: BrandScore;
}

// Espejo del modelo Brand → SocialAccount de brands-front/posts-front: un Post
// pertenece a una SocialAccount (cuenta de una Marca en una red), nunca tiene
// `brand`/`network` como campos propios.
export interface SocialAccount {
  id: string;
  brandName: string;
  socialNetwork: string;
}

export const MOCK_SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: 'bp1', brandName: 'Nike MX', socialNetwork: 'IG' },
  { id: 'bp2', brandName: 'Zara MX', socialNetwork: 'IG' },
  { id: 'bp3', brandName: 'Spotify MX', socialNetwork: 'TK' },
];

export function getSocialAccount(id: string): SocialAccount | undefined {
  return MOCK_SOCIAL_ACCOUNTS.find((p) => p.id === id);
}

export interface MockTopPost {
  id: string;
  title: string;
  brandProfileId: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export const MOCK_KPIS = {
  avgEngagement: 4.6,
  totalReach: 86400,
  avgScore: 78,
  postsAnalyzed: 42,
};

export const MOCK_ENGAGEMENT_SERIES: MockEngagementPoint[] = [
  { day: 'Lun', engagement: 3.8, reach: 9800 },
  { day: 'Mar', engagement: 4.1, reach: 10200 },
  { day: 'Mié', engagement: 4.4, reach: 11500 },
  { day: 'Jue', engagement: 4.0, reach: 10800 },
  { day: 'Vie', engagement: 5.2, reach: 14200 },
  { day: 'Sáb', engagement: 5.6, reach: 15600 },
  { day: 'Dom', engagement: 4.9, reach: 13300 },
];

export const MOCK_BRAND_METRICS: MockBrandMetric[] = [
  {
    id: 'b1',
    name: 'Zara MX',
    color: '#E0A800',
    score: { score: 82, consistency: 88, engagement: 80, coverage: 75, frequency: 85, classification: 'alto', snapshotDate: '28 jun' },
  },
  {
    id: 'b2',
    name: 'Nike MX',
    color: '#42A5F5',
    score: { score: 74, consistency: 70, engagement: 78, coverage: 68, frequency: 72, classification: 'medio', snapshotDate: '28 jun' },
  },
  {
    id: 'b3',
    name: 'Spotify MX',
    color: '#66BB6A',
    score: { score: 58, consistency: 55, engagement: 62, coverage: 50, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
  },
];

export const MOCK_REACH_BY_NETWORK = [
  { network: 'Instagram', reach: 38000, color: '#E0A800' },
  { network: 'TikTok', reach: 24000, color: '#D4AC40' },
  { network: 'Facebook', reach: 15000, color: '#8F8F8F' },
  { network: 'X', reach: 9400, color: '#7A5C00' },
];

export const MOCK_TOP_POSTS: MockTopPost[] = [
  { id: 'p5', title: 'Reels sustentabilidad', brandProfileId: 'bp1', likes: 1240, comments: 87, shares: 34, engagementRate: 5.4 },
  { id: 'p9', title: 'Carrusel verano SS25', brandProfileId: 'bp2', likes: 980, comments: 52, shares: 21, engagementRate: 4.9 },
  { id: 'p11', title: 'Playlist viernes', brandProfileId: 'bp3', likes: 760, comments: 40, shares: 65, engagementRate: 4.5 },
];
