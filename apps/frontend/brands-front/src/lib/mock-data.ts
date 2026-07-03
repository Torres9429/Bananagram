// TODO(dominio-v3): BrandScore vive en @repo/ui y lo consume analytics-front
// (analytics.selectors.ts) — no renombrar a ProfileScore hasta tocar analytics
// en una fase dedicada, para no romper ese contrato compartido.
import type { BrandScore } from '@repo/ui';

export type CampaignStatus = 'active' | 'paused' | 'finished';

// Catálogo de redes sociales disponibles para el onboarding del Cliente.
// Espeja MOCK_SOCIAL_NETWORKS de admin-front sin cruzar microfronts.
export interface SocialNetworkOption {
  code: SocialNetworkCode;
  label: string;
  color: string;
}

export const AVAILABLE_SOCIAL_NETWORKS: SocialNetworkOption[] = [
  { code: 'IG', label: 'Instagram',  color: '#E1306C' },
  { code: 'TK', label: 'TikTok',     color: '#010101' },
  { code: 'FB', label: 'Facebook',   color: '#1877F2' },
  { code: 'LI', label: 'LinkedIn',   color: '#0A66C2' },
  { code: 'X',  label: 'X (Twitter)',color: '#000000' },
  { code: 'YT', label: 'YouTube',    color: '#FF0000' },
];

export const MOCK_CATEGORIES = ['Moda', 'Deportes', 'Tecnología', 'Entretenimiento', 'Gastronomía', 'Salud', 'Educación', 'Arte'];



// "brand"/"company"/"organization"/"creator" = entidad gestionada por un tercero (Nike, Zara...)
// "personal" = persona (Juan Pérez, Dra. María López...)
// Únicamente afecta cómo se presenta en la UI; el resto del modelo y las
// operaciones (campañas, posts, métricas, score) son exactamente iguales.
export type ProfileType = 'brand' | 'company' | 'organization' | 'creator' | 'personal';

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  brand: 'Marca',
  company: 'Empresa',
  organization: 'Organización',
  creator: 'Creador',
  personal: 'Perfil personal',
};

export type SocialNetworkCode = 'IG' | 'TK' | 'LI' | 'FB' | 'X' | 'YT';

// Una cuenta específica de un Profile en una red social (ej. @nike en Instagram).
// Un Profile puede tener varias SocialAccount — una por cada red que gestiona.
// TODO(dominio-v3): brandId es el nombre de campo compartido con el backend
// (JWT AuthState.brandIds, contrato Post.brandProfileId en commons) — no
// renombrar aquí hasta que el backend también migre a "profileId".
export interface SocialAccount {
  id: string;
  brandId: string;
  socialNetwork: SocialNetworkCode;
  handle: string;
  followers: number;
  active: boolean;
}

export interface MockProfile {
  id: string;
  name: string;
  type: ProfileType;
  color: string;
  category: string;
  activeCampaigns: number;
  score: BrandScore;
  profiles: SocialAccount[];
}

// TODO(dominio-v3): brandId — ver nota en SocialAccount, mismo contrato compartido.
export interface MockCampaign {
  id: string;
  brandId: string;
  name: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  postsCount: number;
  // Subconjunto de SocialAccount que esta campaña usa (§A.4 del análisis de dominio).
  // Todavía no se consume en ninguna pantalla — solo preparación del modelo.
  socialAccountIds: string[];
}

export interface MockTeamMember {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
}

// Un evento de calendario corresponde a un post agendado en una SocialAccount
// específica — la red social se obtiene de esa SocialAccount, no es un campo propio.
// campaignId/status se agregaron para soportar los filtros de /profile/calendar
// (campaña, estado) — mismos valores que ya usa MockCampaignPost, sin duplicar concepto.
export interface MockCalendarEvent {
  id: string;
  title: string;
  brandId: string;
  brandProfileId: string;
  campaignId: string;
  status: MockCampaignPost['status'];
  start: string;
  end: string;
  // Id de la publicación en posts-front (MOCK_POSTS), SOLO cuando existe una
  // correspondencia real por título entre ambos mocks independientes — no todo
  // evento de calendario tiene una publicación equivalente ahí.
  postId?: string;
}

// Igual que el calendario: el post pertenece a una SocialAccount, no tiene un
// campo `network` independiente.
export interface MockCampaignPost {
  id: string;
  title: string;
  brandProfileId: string;
  status: 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'programado' | 'publicado';
  scheduledAt: string;
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Activa', bg: '#E8F5E9', color: '#2E7D32' },
  paused: { label: 'Pausada', bg: '#FFF3E0', color: '#E65100' },
  finished: { label: 'Finalizada', bg: '#F5F5F5', color: '#616161' },
};

const ZARA_PROFILES: SocialAccount[] = [
  { id: 'bp1', brandId: 'b1', socialNetwork: 'IG', handle: '@zaramx', followers: 1200000, active: true },
  { id: 'bp2', brandId: 'b1', socialNetwork: 'LI', handle: 'Zara México', followers: 45000, active: true },
  { id: 'bp3', brandId: 'b1', socialNetwork: 'FB', handle: 'Zara México', followers: 980000, active: true },
];

const NIKE_PROFILES: SocialAccount[] = [
  { id: 'bp4', brandId: 'b2', socialNetwork: 'TK', handle: '@nikemx', followers: 560000, active: true },
  { id: 'bp5', brandId: 'b2', socialNetwork: 'IG', handle: '@nikemexico', followers: 2100000, active: true },
];

const SPOTIFY_PROFILES: SocialAccount[] = [
  { id: 'bp6', brandId: 'b3', socialNetwork: 'TK', handle: '@spotifymx', followers: 340000, active: true },
];

// Perfil Personal (§Parte C) — creador de contenido individual, no una marca
// comercial. Valida que ProfileType.personal funciona con el mismo modelo
// (SocialAccount, campaña, equipo, calendario) sin bifurcar flujo.
const ALEX_PROFILES: SocialAccount[] = [
  { id: 'bp7', brandId: 'b4', socialNetwork: 'IG', handle: '@alexrivera', followers: 45000, active: true },
  { id: 'bp8', brandId: 'b4', socialNetwork: 'TK', handle: '@alexrivera', followers: 92000, active: true },
];

export const MOCK_PROFILES: MockProfile[] = [
  {
    id: 'b1',
    name: 'Zara MX',
    type: 'brand',
    color: '#E0A800',
    category: 'Moda',
    activeCampaigns: 2,
    score: { score: 82, consistency: 88, engagement: 80, coverage: 75, frequency: 85, classification: 'alto', snapshotDate: '28 jun' },
    profiles: ZARA_PROFILES,
  },
  {
    id: 'b2',
    name: 'Nike MX',
    type: 'brand',
    color: '#42A5F5',
    category: 'Deportes',
    activeCampaigns: 1,
    score: { score: 74, consistency: 70, engagement: 78, coverage: 68, frequency: 72, classification: 'medio', snapshotDate: '28 jun' },
    profiles: NIKE_PROFILES,
  },
  {
    id: 'b3',
    name: 'Spotify MX',
    type: 'brand',
    color: '#66BB6A',
    category: 'Entretenimiento',
    activeCampaigns: 1,
    score: { score: 58, consistency: 55, engagement: 62, coverage: 50, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
    profiles: SPOTIFY_PROFILES,
  },
  {
    id: 'b4',
    name: 'Alex Rivera',
    type: 'personal',
    color: '#AB47BC',
    category: 'Entretenimiento',
    activeCampaigns: 1,
    score: { score: 71, consistency: 65, engagement: 88, coverage: 55, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
    profiles: ALEX_PROFILES,
  },
];

export const MOCK_SOCIAL_ACCOUNTS: SocialAccount[] = [...ZARA_PROFILES, ...NIKE_PROFILES, ...SPOTIFY_PROFILES, ...ALEX_PROFILES];

export function getSocialAccount(id: string): SocialAccount | undefined {
  return MOCK_SOCIAL_ACCOUNTS.find((p) => p.id === id);
}

export function getSocialAccountsByProfile(brandId: string): SocialAccount[] {
  return MOCK_SOCIAL_ACCOUNTS.filter((p) => p.brandId === brandId);
}

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  { id: 'c1', brandId: 'b1', name: 'Campaña Verano', status: 'active', startDate: '1 jun', endDate: '31 jul', postsCount: 12, socialAccountIds: ['bp1', 'bp2', 'bp3'] },
  { id: 'c4', brandId: 'b1', name: 'Black Friday', status: 'paused', startDate: '1 nov', endDate: '30 nov', postsCount: 4, socialAccountIds: ['bp1', 'bp3'] },
  { id: 'c2', brandId: 'b2', name: 'Nike Run Launch', status: 'active', startDate: '15 jun', endDate: '15 ago', postsCount: 8, socialAccountIds: ['bp4', 'bp5'] },
  { id: 'c3', brandId: 'b3', name: 'Spotify Weekly', status: 'finished', startDate: '1 ene', endDate: '31 may', postsCount: 20, socialAccountIds: ['bp6'] },
  { id: 'c5', brandId: 'b4', name: 'Serie Reels diarios', status: 'active', startDate: '10 jun', endDate: '10 ago', postsCount: 6, socialAccountIds: ['bp7', 'bp8'] },
];

// Resuelve el Perfil del Cliente autenticado — hoy la única asociación real
// usuario↔perfil en los mocks (antes todo Cliente veía siempre MOCK_PROFILES[0]).
// Clientes sin mapeo explícito caen al mismo default de siempre, para no
// romper el flujo existente (cliente@bananagram.mx sigue viendo Zara).
const CLIENT_PROFILE_BY_EMAIL: Record<string, string> = {
  'alex@bananagram.mx': 'b4',
};

export function getCurrentClientProfile(userEmail?: string | null): MockProfile {
  const profileId = userEmail ? CLIENT_PROFILE_BY_EMAIL[userEmail.toLowerCase().trim()] : undefined;
  return MOCK_PROFILES.find((p) => p.id === profileId) ?? MOCK_PROFILES[0];
}

// Utilidades del modelo de dominio nuevo (§A.4 del análisis de dominio) — preparadas
// para consumo futuro. Ninguna pantalla las utiliza todavía.
export function getCampaignSocialAccounts(campaignId: string): SocialAccount[] {
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) return [];
  return campaign.socialAccountIds
    .map((id) => getSocialAccount(id))
    .filter((a): a is SocialAccount => !!a);
}

export function campaignUsesSocialAccount(campaignId: string, socialAccountId: string): boolean {
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  return campaign?.socialAccountIds.includes(socialAccountId) ?? false;
}

// Especialidades disponibles para el perfil de CM/Diseñador.
export const MOCK_SPECIALTIES = ['Diseño gráfico', 'Copywriting', 'Video y edición', 'Fotografía', 'Paid media', 'SEO/SEM', 'Animación'];

export type Availability = 'disponible' | 'no_disponible';

// Un perfil de CM o Diseñador visible para selección.
// perfil_completo = categories.length > 0 && specialties.length > 0
export interface MockAvailableDesigner {
  id: string;
  name: string;
  avatarBg: string;
  avatarColor: string;
  categories: string[];
  specialties: string[];
  availability: Availability;
  perfilCompleto: boolean;
  bio: string;
}

export interface MockAvailableCM {
  id: string;
  name: string;
  categories: string[];
  specialties: string[];
  availability: Availability;
  perfilCompleto: boolean;
  bio: string;
  avatarBg: string;
  avatarColor: string;
  designers: MockAvailableDesigner[];
}

// Diseñadores disponibles en el sistema (perfil_completo = true, disponibilidad = disponible).
// Solo estos aparecen en el listado del CM al armar su equipo.
export const MOCK_AVAILABLE_DESIGNERS: MockAvailableDesigner[] = [
  {
    id: 'u2', name: 'Alexa Delgado', avatarBg: '#E3F2FD', avatarColor: '#1565C0',
    categories: ['Moda', 'Arte'], specialties: ['Diseño gráfico', 'Fotografía'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'Especialista en identidad visual y contenido para moda.',
  },
  {
    id: 'u3', name: 'Elías Bailón', avatarBg: '#E3F2FD', avatarColor: '#1565C0',
    categories: ['Moda', 'Gastronomía'], specialties: ['Video y edición', 'Animación'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'Creativo en video corto y reels para marcas de consumo.',
  },
  {
    id: 'u7', name: 'Iván Soto', avatarBg: '#E3F2FD', avatarColor: '#1565C0',
    categories: ['Deportes', 'Tecnología'], specialties: ['Copywriting', 'Diseño gráfico'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'Copy y diseño para marcas deportivas y de tecnología.',
  },
  {
    id: 'u9', name: 'Carla Núñez', avatarBg: '#E3F2FD', avatarColor: '#1565C0',
    categories: ['Moda'], specialties: ['Fotografía', 'Video y edición'],
    availability: 'no_disponible', perfilCompleto: true,
    bio: 'Fotógrafa de moda y lifestyle.',
  },
];

// Onboarding del Cliente: el Cliente elige un CM por campaña.
// Solo aparecen CMs con perfil_completo = true y disponibilidad = disponible.
export const MOCK_AVAILABLE_CMS: MockAvailableCM[] = [
  {
    id: 'u1', name: 'Ana García', avatarBg: '#FFF8E1', avatarColor: '#7A5C00',
    categories: ['Moda', 'Entretenimiento'], specialties: ['Copywriting', 'Diseño gráfico'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'CM con 5 años en moda y entretenimiento. Especialista en Instagram y TikTok.',
    designers: MOCK_AVAILABLE_DESIGNERS.filter((d) => ['u3', 'u2'].includes(d.id)),
  },
  {
    id: 'u6', name: 'Diego Ferman', avatarBg: '#FFF8E1', avatarColor: '#7A5C00',
    categories: ['Deportes', 'Tecnología'], specialties: ['Paid media', 'SEO/SEM'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'CM enfocado en marcas deportivas y tech. Especialista en campañas de performance.',
    designers: MOCK_AVAILABLE_DESIGNERS.filter((d) => d.id === 'u7'),
  },
  {
    id: 'u8', name: 'Valeria Cruz', avatarBg: '#FFF8E1', avatarColor: '#7A5C00',
    categories: ['Moda'], specialties: ['Video y edición', 'Fotografía'],
    availability: 'no_disponible', perfilCompleto: true,
    bio: 'CM creativa para marcas de lujo y moda. Actualmente sin disponibilidad.',
    designers: MOCK_AVAILABLE_DESIGNERS.filter((d) => d.id === 'u9'),
  },
];

export function getAvailableCMsForCategory(category: string): MockAvailableCM[] {
  return [...MOCK_AVAILABLE_CMS]
    .filter((cm) => cm.perfilCompleto && cm.availability === 'disponible')
    .sort((a, b) => {
      const aMatch = a.categories.includes(category) ? 0 : 1;
      const bMatch = b.categories.includes(category) ? 0 : 1;
      return aMatch - bMatch;
    });
}

export function getAvailableDesigners(): MockAvailableDesigner[] {
  return MOCK_AVAILABLE_DESIGNERS.filter((d) => d.perfilCompleto && d.availability === 'disponible');
}

export function assignTeamToCampaign(campaignId: string, members: MockTeamMember[]) {
  MOCK_TEAM_BY_CAMPAIGN[campaignId] = members;
}

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
  c5: [
    { id: 'u2', name: 'Alexa Delgado', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
    { id: 'u10', name: 'Alex Rivera', role: 'Cliente', avatarBg: '#F3E5F5', avatarColor: '#6A1B9A' },
  ],
};

export const MOCK_POSTS_BY_CAMPAIGN: Record<string, MockCampaignPost[]> = {
  c1: [
    { id: 'p1', title: 'Post lanzamiento verano', brandProfileId: 'bp1', status: 'borrador', scheduledAt: '—' },
    { id: 'p3', title: 'Carrusel colores SS25', brandProfileId: 'bp2', status: 'en_revision', scheduledAt: '—' },
    { id: 'p4', title: 'Story promo weekend', brandProfileId: 'bp3', status: 'programado', scheduledAt: 'Hoy 18:00' },
  ],
  c2: [
    { id: 'p2', title: 'Reel Nike 30 seg', brandProfileId: 'bp4', status: 'rechazado', scheduledAt: '—' },
    { id: 'p5', title: 'Reels sustentabilidad', brandProfileId: 'bp5', status: 'publicado', scheduledAt: 'Ayer 12:00' },
  ],
  c5: [
    { id: 'p6', title: 'Rutina de la mañana', brandProfileId: 'bp7', status: 'en_revision', scheduledAt: '—' },
    { id: 'p7', title: 'Trend challenge TikTok', brandProfileId: 'bp8', status: 'programado', scheduledAt: 'Mañana 20:00' },
  ],
};

export interface MockMyCampaign extends MockCampaign {
  profileName: string;
  profileColor: string;
}

export function getMyCampaigns(): MockMyCampaign[] {
  return MOCK_CAMPAIGNS.map((c) => {
    const profile = MOCK_PROFILES.find((b) => b.id === c.brandId)!;
    return { ...c, profileName: profile.name, profileColor: profile.color };
  });
}

export interface MockTeamAggregate {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
  campaigns: { id: string; name: string; profileName: string }[];
}

export function getTeamAggregate(): MockTeamAggregate[] {
  const byMember = new Map<string, MockTeamAggregate>();
  for (const [campaignId, members] of Object.entries(MOCK_TEAM_BY_CAMPAIGN)) {
    const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
    const profile = campaign ? MOCK_PROFILES.find((b) => b.id === campaign.brandId) : undefined;
    if (!campaign || !profile) continue;
    for (const member of members) {
      const entry = byMember.get(member.id) ?? { ...member, campaigns: [] };
      entry.campaigns.push({ id: campaign.id, name: campaign.name, profileName: profile.name });
      byMember.set(member.id, entry);
    }
  }
  return Array.from(byMember.values());
}

export const MOCK_CALENDAR_EVENTS: MockCalendarEvent[] = [
  { id: 'e1', title: 'Post lanzamiento verano (Zara)', brandId: 'b1', brandProfileId: 'bp1', campaignId: 'c1', status: 'publicado', start: '2026-06-29T10:00:00', end: '2026-06-29T11:00:00', postId: 'p1' },
  { id: 'e2', title: 'Story promo weekend (Zara)', brandId: 'b1', brandProfileId: 'bp3', campaignId: 'c4', status: 'publicado', start: '2026-06-30T18:00:00', end: '2026-06-30T19:00:00', postId: 'p4' },
  { id: 'e3', title: 'Reel Nike Run (Nike)', brandId: 'b2', brandProfileId: 'bp4', campaignId: 'c2', status: 'publicado', start: '2026-07-01T09:00:00', end: '2026-07-01T10:00:00' },
  { id: 'e4', title: 'Playlist viernes (Spotify)', brandId: 'b3', brandProfileId: 'bp6', campaignId: 'c3', status: 'publicado', start: '2026-07-03T15:00:00', end: '2026-07-03T16:00:00' },
  // Eventos adicionales de Zara MX (b1, el perfil del Cliente demo) — dan
  // material real a los filtros de campaña/red/estado en /profile/calendar.
  { id: 'e5', title: 'Carrusel colección otoño (Zara)', brandId: 'b1', brandProfileId: 'bp1', campaignId: 'c1', status: 'programado', start: '2026-07-05T10:00:00', end: '2026-07-05T11:00:00' },
  { id: 'e6', title: 'Post corporativo LinkedIn (Zara)', brandId: 'b1', brandProfileId: 'bp2', campaignId: 'c1', status: 'aprobado', start: '2026-07-04T14:00:00', end: '2026-07-04T14:30:00' },
  { id: 'e7', title: 'Promo Black Friday early (Zara)', brandId: 'b1', brandProfileId: 'bp3', campaignId: 'c4', status: 'programado', start: '2026-07-06T12:00:00', end: '2026-07-06T12:30:00' },
  { id: 'e8', title: 'Reel detrás de cámaras (Zara)', brandId: 'b1', brandProfileId: 'bp1', campaignId: 'c1', status: 'en_revision', start: '2026-07-03T09:00:00', end: '2026-07-03T09:30:00' },
  { id: 'e9', title: 'Story cuenta regresiva Black Friday (Zara)', brandId: 'b1', brandProfileId: 'bp3', campaignId: 'c4', status: 'borrador', start: '2026-07-08T16:00:00', end: '2026-07-08T16:30:00' },
  { id: 'e10', title: 'Artículo aliados de marca (Zara)', brandId: 'b1', brandProfileId: 'bp2', campaignId: 'c1', status: 'publicado', start: '2026-06-27T11:00:00', end: '2026-06-27T11:30:00' },
  // Eventos de Alex Rivera (b4, Perfil personal) — sin postId: no existe una
  // publicación real correspondiente en posts-front (mock independiente, ver
  // nota en MockCalendarEvent.postId).
  { id: 'e11', title: 'Rutina de la mañana', brandId: 'b4', brandProfileId: 'bp7', campaignId: 'c5', status: 'en_revision', start: '2026-07-02T08:00:00', end: '2026-07-02T08:15:00' },
  { id: 'e12', title: 'Trend challenge TikTok', brandId: 'b4', brandProfileId: 'bp8', campaignId: 'c5', status: 'programado', start: '2026-07-03T20:00:00', end: '2026-07-03T20:15:00' },
  { id: 'e13', title: 'Reel unboxing', brandId: 'b4', brandProfileId: 'bp7', campaignId: 'c5', status: 'publicado', start: '2026-06-28T19:00:00', end: '2026-06-28T19:15:00' },
];
