import type { BrandScore } from '@repo/ui';

export type CampaignStatus = 'active' | 'paused' | 'finished';

export interface MockBrand {
  id: string;
  name: string;
  color: string;
  category: string;
  activeCampaigns: number;
  score: BrandScore;
}

export interface MockCampaign {
  id: string;
  brandId: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  postsCount: number;
}

export interface MockTeamMember {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
}

export interface MockCalendarEvent {
  id: string;
  title: string;
  brandId: string;
  start: string;
  end: string;
  network: string;
}

export interface MockCampaignPost {
  id: string;
  title: string;
  network: string;
  status: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'programado' | 'publicado';
  scheduledAt: string;
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Activa', bg: '#E8F5E9', color: '#2E7D32' },
  paused: { label: 'Pausada', bg: '#FFF3E0', color: '#E65100' },
  finished: { label: 'Finalizada', bg: '#F5F5F5', color: '#616161' },
};

export const MOCK_BRANDS: MockBrand[] = [
  {
    id: 'b1',
    name: 'Zara MX',
    color: '#FDC726',
    category: 'Moda',
    activeCampaigns: 2,
    score: { score: 82, consistency: 88, engagement: 80, coverage: 75, frequency: 85, classification: 'alto', snapshotDate: '28 jun' },
  },
  {
    id: 'b2',
    name: 'Nike MX',
    color: '#42A5F5',
    category: 'Deportes',
    activeCampaigns: 1,
    score: { score: 74, consistency: 70, engagement: 78, coverage: 68, frequency: 72, classification: 'medio', snapshotDate: '28 jun' },
  },
  {
    id: 'b3',
    name: 'Spotify MX',
    color: '#66BB6A',
    category: 'Entretenimiento',
    activeCampaigns: 1,
    score: { score: 58, consistency: 55, engagement: 62, coverage: 50, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
  },
];

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  { id: 'c1', brandId: 'b1', name: 'Campaña Verano', status: 'active', startDate: '1 jun', endDate: '31 jul', postsCount: 12 },
  { id: 'c4', brandId: 'b1', name: 'Black Friday', status: 'paused', startDate: '1 nov', endDate: '30 nov', postsCount: 4 },
  { id: 'c2', brandId: 'b2', name: 'Nike Run Launch', status: 'active', startDate: '15 jun', endDate: '15 ago', postsCount: 8 },
  { id: 'c3', brandId: 'b3', name: 'Spotify Weekly', status: 'finished', startDate: '1 ene', endDate: '31 may', postsCount: 20 },
];

export const MOCK_TEAM_BY_CAMPAIGN: Record<string, MockTeamMember[]> = {
  c1: [
    { id: 'u1', name: 'Ana García', role: 'Community Manager', avatarBg: '#FFF8E1', avatarColor: '#7A5C00' },
    { id: 'u3', name: 'Elías Bailón', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
    { id: 'u4', name: 'Rocío Rodríguez', role: 'Cliente', avatarBg: '#E8F5E9', avatarColor: '#2E7D32' },
  ],
  c2: [
    { id: 'u1', name: 'Ana García', role: 'Community Manager', avatarBg: '#FFF8E1', avatarColor: '#7A5C00' },
    { id: 'u2', name: 'Alexa Delgado', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
  ],
};

export const MOCK_POSTS_BY_CAMPAIGN: Record<string, MockCampaignPost[]> = {
  c1: [
    { id: 'p1', title: 'Post lanzamiento verano', network: 'IG', status: 'borrador', scheduledAt: '—' },
    { id: 'p3', title: 'Carrusel colores SS25', network: 'LI', status: 'en_revision', scheduledAt: '—' },
    { id: 'p4', title: 'Story promo weekend', network: 'FB', status: 'programado', scheduledAt: 'Hoy 18:00' },
  ],
  c2: [
    { id: 'p2', title: 'Reel Nike 30 seg', network: 'TK', status: 'rechazado', scheduledAt: '—' },
    { id: 'p5', title: 'Reels sustentabilidad', network: 'IG', status: 'publicado', scheduledAt: 'Ayer 12:00' },
  ],
};

export interface MockMyCampaign extends MockCampaign {
  brandName: string;
  brandColor: string;
}

export function getMyCampaigns(): MockMyCampaign[] {
  return MOCK_CAMPAIGNS.map((c) => {
    const brand = MOCK_BRANDS.find((b) => b.id === c.brandId)!;
    return { ...c, brandName: brand.name, brandColor: brand.color };
  });
}

export interface MockTeamAggregate {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
  campaigns: { id: string; name: string; brandName: string }[];
}

export function getTeamAggregate(): MockTeamAggregate[] {
  const byMember = new Map<string, MockTeamAggregate>();
  for (const [campaignId, members] of Object.entries(MOCK_TEAM_BY_CAMPAIGN)) {
    const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
    const brand = campaign ? MOCK_BRANDS.find((b) => b.id === campaign.brandId) : undefined;
    if (!campaign || !brand) continue;
    for (const member of members) {
      const entry = byMember.get(member.id) ?? { ...member, campaigns: [] };
      entry.campaigns.push({ id: campaign.id, name: campaign.name, brandName: brand.name });
      byMember.set(member.id, entry);
    }
  }
  return Array.from(byMember.values());
}

export const MOCK_CALENDAR_EVENTS: MockCalendarEvent[] = [
  { id: 'e1', title: 'Post lanzamiento verano (Zara)', brandId: 'b1', start: '2026-06-29T10:00:00', end: '2026-06-29T11:00:00', network: 'IG' },
  { id: 'e2', title: 'Story promo weekend (Zara)', brandId: 'b1', start: '2026-06-30T18:00:00', end: '2026-06-30T19:00:00', network: 'FB' },
  { id: 'e3', title: 'Reel Nike Run (Nike)', brandId: 'b2', start: '2026-07-01T09:00:00', end: '2026-07-01T10:00:00', network: 'TK' },
  { id: 'e4', title: 'Playlist viernes (Spotify)', brandId: 'b3', start: '2026-07-03T15:00:00', end: '2026-07-03T16:00:00', network: 'TK' },
];
