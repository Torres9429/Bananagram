import {
  AVAILABLE_SOCIAL_NETWORKS,
  getSocialNetwork,
  MOCK_BRANDS,
  MOCK_SOCIAL_ACCOUNTS,
  getSocialAccount,
  getSocialAccountsByBrand,
  MOCK_CAMPAIGNS as SHARED_MOCK_CAMPAIGNS,
  getSocialAccountsForCampaign,
  campaignUsesSocialAccount,
} from '@repo/ui';
import type {
  CampaignStatus,
  SocialNetworkOption,
  ProfileType,
  SocialNetworkCode,
  SocialAccount,
  MockProfile,
  MockCampaign,
  MockTeamMember,
  MockCalendarEvent,
  MockCampaignPost,
  Availability,
  MockAvailableDesigner,
  MockAvailableCM,
  MockMyCampaign,
  MockTeamAggregate,
} from '../interfaces/interface';

// Catálogo de redes sociales, marcas, cuentas sociales y campañas base ahora
// viven en @repo/ui (mock-world.ts) — fuente única compartida con
// posts-front, para que "la cuenta de Instagram de Zara" sea la MISMA
// entidad (mismo id, mismos followers) sin importar desde qué microfront se
// consulte. Antes brands-front mantenía su propia copia con los mismos IDs
// (bp1, c1...) pero potencialmente valores distintos. Se re-exportan con el
// mismo nombre que tenían localmente para no tocar los call-sites existentes.
export { AVAILABLE_SOCIAL_NETWORKS, getSocialNetwork, MOCK_SOCIAL_ACCOUNTS, getSocialAccount, campaignUsesSocialAccount };

// Alias local: el nombre "byProfile" es el que usan todos los call-sites de
// brands-front (el concepto de "Profile" = Brand en este app); mock-world lo
// expone como getSocialAccountsByBrand (nombre canónico del modelo).
export function getSocialAccountsByProfile(brandId: string): SocialAccount[] {
  return getSocialAccountsByBrand(brandId);
}

// MockProfile.categoryId (marca, no perfil de CM/Diseñador — ese ya usa el
// catálogo real, ver StaffProfileSection) es un string plano sin id propio,
// así que "resolver el nombre" es una operación identidad; se deja como
// función para no acoplar los call-sites a ese detalle si el catálogo gana
// ids reales.
export function getCategoryName(categoryId: string): string {
  return categoryId;
}

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  brand: 'Marca',
  company: 'Empresa',
  organization: 'Organización',
  creator: 'Creador',
  personal: 'Perfil personal',
};

// El backend solo acepta 'brand'|'profile' en Brand.profileType
// (CreateBrandDto/UpdateBrandDto: @IsIn(['brand','profile']), regla de
// negocio #9) — PROFILE_TYPE_LABELS tiene más valores porque también los usa
// el mock de perfiles de CM/Diseñador, pero un formulario de Brand real solo
// puede enviar estos dos.
export const BRAND_TYPE_OPTIONS: { value: 'brand' | 'profile'; label: string }[] = [
  { value: 'brand', label: 'Marca' },
  { value: 'profile', label: 'Perfil' },
];

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Activa', bg: '#E8F5E9', color: '#2E7D32' },
  paused: { label: 'Pausada', bg: '#FFF3E0', color: '#E65100' },
  finished: { label: 'Finalizada', bg: '#F5F5F5', color: '#616161' },
};

// Score por marca — no está en mock-world.ts (es un mock local del dominio de
// analytics, fuera del alcance de "mundo compartido"). Se mantiene tal cual
// estaba, indexado por Brand.id.
const MOCK_SCORE_BY_BRAND: Record<string, MockProfile['score']> = {
  b1: { id: 'score-b1', brandId: 'b1', score: 82, consistency: 88, engagement: 80, coverage: 75, frequency: 85, classification: 'alto', snapshotDate: '28 jun' },
  b2: { id: 'score-b2', brandId: 'b2', score: 74, consistency: 70, engagement: 78, coverage: 68, frequency: 72, classification: 'medio', snapshotDate: '28 jun' },
  b3: { id: 'score-b3', brandId: 'b3', score: 58, consistency: 55, engagement: 62, coverage: 50, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
  b4: { id: 'score-b4', brandId: 'b4', score: 71, consistency: 65, engagement: 88, coverage: 55, frequency: 60, classification: 'medio', snapshotDate: '28 jun' },
};

// MOCK_PROFILES ahora se construye a partir de MOCK_BRANDS (@repo/ui,
// mock-world.ts) — sus datos base (id/name/profileType/ownerId/slug/logoUrl/
// primaryColor) vienen de ahí; solo color/activeCampaigns/score/socialAccounts
// son extras propios de brands-front (no están en mock-world). `color` espeja
// `primaryColor` (mismo valor, campo legado que ya consumían varias pantallas
// de este app). `activeCampaigns` se recalcula desde SHARED_MOCK_CAMPAIGNS en
// vez de quedar hardcodeado, para no divergir de la fuente compartida.
export const MOCK_PROFILES: MockProfile[] = MOCK_BRANDS.map((brand) => ({
  id: brand.id,
  name: brand.name,
  profileType: brand.profileType,
  color: brand.primaryColor ?? '#616161',
  categoryId: brand.categoryId ?? '',
  activeCampaigns: SHARED_MOCK_CAMPAIGNS.filter((c) => c.brandId === brand.id && c.status === 'active').length,
  score: MOCK_SCORE_BY_BRAND[brand.id],
  socialAccounts: getSocialAccountsByBrand(brand.id),
  ownerId: brand.ownerId,
  slug: brand.slug,
  logoUrl: brand.logoUrl,
  primaryColor: brand.primaryColor,
}));

// postsCount no está en mock-world.ts (Campaign no lo tiene — se deriva de
// posts-front en la realidad, pero ese mock es independiente, ver nota en
// MockCalendarEvent.postId). Se mantiene como extra local indexado por id,
// con los mismos valores que ya tenía este app.
const POSTS_COUNT_BY_CAMPAIGN: Record<string, number> = {
  c1: 12,
  c4: 4,
  c2: 8,
  c3: 20,
  c5: 6,
};

// MOCK_CAMPAIGNS se deriva de SHARED_MOCK_CAMPAIGNS (@repo/ui, mock-world.ts)
// + postsCount local — mismo id/brandId/status/fechas/socialAccountIds/cmId/
// createdBy/objective/description que ve posts-front, sin duplicar esos
// valores a mano aquí (evita que vuelvan a divergir como antes).
export const MOCK_CAMPAIGNS: MockCampaign[] = SHARED_MOCK_CAMPAIGNS.map((c) => ({
  ...c,
  startDate: c.startDate ?? '',
  endDate: c.endDate ?? '',
  postsCount: POSTS_COUNT_BY_CAMPAIGN[c.id] ?? 0,
}));

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

// Alias local: mock-world expone esto como getSocialAccountsForCampaign
// (nombre genérico, también usado por posts-front); brands-front conserva el
// nombre "getCampaignSocialAccounts" que ya usaban sus call-sites
// (components/campaigns/CampaignCard.tsx). campaignUsesSocialAccount se
// re-exporta arriba tal cual desde @repo/ui (mismo nombre, sin call-sites
// hoy pero se mantiene por si algo la retoma).
export function getCampaignSocialAccounts(campaignId: string): SocialAccount[] {
  return getSocialAccountsForCampaign(campaignId);
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
    id: 'u1', name: 'Ana García', avatarBg: '#FFF8E1', avatarColor: 'primary.contrastTextMuted',
    categories: ['Moda', 'Entretenimiento'], specialties: ['Copywriting', 'Diseño gráfico'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'CM con 5 años en moda y entretenimiento. Especialista en Instagram y TikTok.',
    designers: MOCK_AVAILABLE_DESIGNERS.filter((d) => ['u3', 'u2'].includes(d.id)),
  },
  {
    id: 'u6', name: 'Diego Ferman', avatarBg: '#FFF8E1', avatarColor: 'primary.contrastTextMuted',
    categories: ['Deportes', 'Tecnología'], specialties: ['Paid media', 'SEO/SEM'],
    availability: 'disponible', perfilCompleto: true,
    bio: 'CM enfocado en marcas deportivas y tech. Especialista en campañas de performance.',
    designers: MOCK_AVAILABLE_DESIGNERS.filter((d) => d.id === 'u7'),
  },
  {
    id: 'u8', name: 'Valeria Cruz', avatarBg: '#FFF8E1', avatarColor: 'primary.contrastTextMuted',
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

// El CM ya NO vive en una lista de team members — es Campaign.cmId (FK única,
// ver interfaces/interface.ts). Se resuelve en tiempo real desde
// MOCK_AVAILABLE_CMS por id en vez de duplicar sus datos en otra estructura
// (decisión 7 de docs/frontend-db-alignment.md §9.7: "agregar cmId directo al
// objeto MockCampaign y resolver el nombre desde ahí").
export function getCampaignCM(campaignId: string): MockTeamMember | null {
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) return null;
  const cm = MOCK_AVAILABLE_CMS.find((c) => c.id === campaign.cmId);
  if (!cm) return null;
  return { id: cm.id, name: cm.name, role: 'Community Manager', avatarBg: cm.avatarBg, avatarColor: cm.avatarColor };
}

// Solo Diseñadores (CampaignDesigner: join N sin campo de rol) — el CM ya no
// se mezcla aquí (ver getCampaignCM) y el Cliente nunca fue un team member
// (es Campaign.createdBy).
export const MOCK_CAMPAIGN_DESIGNERS: Record<string, MockTeamMember[]> = {
  c1: [
    { id: 'u3', name: 'Elías Bailón', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
  ],
  c2: [
    { id: 'u2', name: 'Alexa Delgado', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
  ],
  c5: [
    { id: 'u2', name: 'Alexa Delgado', role: 'Diseñador', avatarBg: '#E3F2FD', avatarColor: '#1565C0' },
  ],
};

export function getMyCampaigns(): MockMyCampaign[] {
  return MOCK_CAMPAIGNS.map((c) => {
    const profile = MOCK_PROFILES.find((b) => b.id === c.brandId)!;
    return { ...c, profileName: profile.name, profileColor: profile.color };
  });
}

// Agrega CM + Diseñadores de cada campaña (sin Cliente, ver decisión 7) para
// la vista "Equipo" (/team) — antes iteraba MOCK_TEAM_BY_CAMPAIGN directo,
// ahora combina las dos fuentes (getCampaignCM + MOCK_CAMPAIGN_DESIGNERS).
export function getTeamAggregate(): MockTeamAggregate[] {
  const byMember = new Map<string, MockTeamAggregate>();
  for (const campaign of MOCK_CAMPAIGNS) {
    const profile = MOCK_PROFILES.find((b) => b.id === campaign.brandId);
    if (!profile) continue;
    const cm = getCampaignCM(campaign.id);
    const designers = MOCK_CAMPAIGN_DESIGNERS[campaign.id] ?? [];
    const members = cm ? [cm, ...designers] : designers;
    for (const member of members) {
      const entry = byMember.get(member.id) ?? { ...member, campaigns: [] };
      entry.campaigns.push({ id: campaign.id, name: campaign.name, profileName: profile.name });
      byMember.set(member.id, entry);
    }
  }
  return Array.from(byMember.values());
}

export const MOCK_CALENDAR_EVENTS: MockCalendarEvent[] = [
  { id: 'e1', title: 'Post lanzamiento verano (Zara)', brandId: 'b1', socialAccountId: 'bp1', campaignId: 'c1', status: 'publicado', start: '2026-06-29T10:00:00', end: '2026-06-29T11:00:00', postId: 'p1' },
  { id: 'e2', title: 'Story promo weekend (Zara)', brandId: 'b1', socialAccountId: 'bp3', campaignId: 'c4', status: 'publicado', start: '2026-06-30T18:00:00', end: '2026-06-30T19:00:00', postId: 'p4' },
  { id: 'e3', title: 'Reel Nike Run (Nike)', brandId: 'b2', socialAccountId: 'bp4', campaignId: 'c2', status: 'publicado', start: '2026-07-01T09:00:00', end: '2026-07-01T10:00:00' },
  { id: 'e4', title: 'Playlist viernes (Spotify)', brandId: 'b3', socialAccountId: 'bp6', campaignId: 'c3', status: 'publicado', start: '2026-07-03T15:00:00', end: '2026-07-03T16:00:00' },
  // Eventos adicionales de Zara MX (b1, el perfil del Cliente demo) — dan
  // material real a los filtros de campaña/red/estado en /profile/calendar.
  { id: 'e5', title: 'Carrusel colección otoño (Zara)', brandId: 'b1', socialAccountId: 'bp1', campaignId: 'c1', status: 'programado', start: '2026-07-05T10:00:00', end: '2026-07-05T11:00:00' },
  { id: 'e6', title: 'Post corporativo LinkedIn (Zara)', brandId: 'b1', socialAccountId: 'bp2', campaignId: 'c1', status: 'aprobado', start: '2026-07-04T14:00:00', end: '2026-07-04T14:30:00' },
  { id: 'e7', title: 'Promo Black Friday early (Zara)', brandId: 'b1', socialAccountId: 'bp3', campaignId: 'c4', status: 'programado', start: '2026-07-06T12:00:00', end: '2026-07-06T12:30:00' },
  { id: 'e8', title: 'Reel detrás de cámaras (Zara)', brandId: 'b1', socialAccountId: 'bp1', campaignId: 'c1', status: 'en_revision', start: '2026-07-03T09:00:00', end: '2026-07-03T09:30:00' },
  { id: 'e9', title: 'Story cuenta regresiva Black Friday (Zara)', brandId: 'b1', socialAccountId: 'bp3', campaignId: 'c4', status: 'borrador', start: '2026-07-08T16:00:00', end: '2026-07-08T16:30:00' },
  { id: 'e10', title: 'Artículo aliados de marca (Zara)', brandId: 'b1', socialAccountId: 'bp2', campaignId: 'c1', status: 'publicado', start: '2026-06-27T11:00:00', end: '2026-06-27T11:30:00' },
  // Eventos de Alex Rivera (b4, Perfil personal) — sin postId: no existe una
  // publicación real correspondiente en posts-front (mock independiente, ver
  // nota en MockCalendarEvent.postId).
  { id: 'e11', title: 'Rutina de la mañana', brandId: 'b4', socialAccountId: 'bp7', campaignId: 'c5', status: 'en_revision', start: '2026-07-02T08:00:00', end: '2026-07-02T08:15:00' },
  { id: 'e12', title: 'Trend challenge TikTok', brandId: 'b4', socialAccountId: 'bp8', campaignId: 'c5', status: 'programado', start: '2026-07-03T20:00:00', end: '2026-07-03T20:15:00' },
  { id: 'e13', title: 'Reel unboxing', brandId: 'b4', socialAccountId: 'bp7', campaignId: 'c5', status: 'publicado', start: '2026-06-28T19:00:00', end: '2026-06-28T19:15:00' },
];
