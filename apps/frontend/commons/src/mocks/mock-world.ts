// "Mundo" mock compartido — marcas, cuentas sociales y campañas, en un solo
// lugar para que brands-front y posts-front (los dos microfronts que
// necesitan estas mismas entidades) dejen de mantener copias independientes
// con IDs parecidos pero shapes/valores divergentes. Ver
// docs/frontend-db-alignment-implementation.md §7 — antes esto estaba
// deliberadamente fragmentado por app; se unificó el 2026-07-19.
//
// Sigue siendo mock puro (sin backend real detrás) — solo se garantiza que
// "la cuenta de Instagram de Zara" es la MISMA entidad (mismo id, mismos
// followers, mismo handle) sin importar desde qué microfront se consulte.
import type { Brand } from '../types/brand.types';
import type { Campaign } from '../types/campaign.types';
import type { SocialAccount, SocialNetworkOption } from '../types/social-network.types';

// ── Catálogo de redes sociales (gestionado por Admin en la BD real) ────────
export const AVAILABLE_SOCIAL_NETWORKS: SocialNetworkOption[] = [
  { id: 'instagram', code: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', code: 'tiktok', label: 'TikTok', color: '#010101' },
  { id: 'facebook', code: 'facebook', label: 'Facebook', color: '#1877F2' },
  { id: 'linkedin', code: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'x', code: 'x', label: 'X (Twitter)', color: '#000000' },
  { id: 'youtube', code: 'youtube', label: 'YouTube', color: '#FF0000' },
];

export function getSocialNetwork(socialNetworkId: string): SocialNetworkOption | undefined {
  return AVAILABLE_SOCIAL_NETWORKS.find((n) => n.id === socialNetworkId);
}

// ── Marcas ───────────────────────────────────────────────────────────────
// ownerId apunta a los MockUser reales de mocks/mock-users.ts
// (cliente@bananagram.mx / alex@bananagram.mx) — Zara/Nike/Spotify son del
// mismo Cliente (Brand.ownerId es 1 dueño por marca, ver modelo.txt); el
// perfil personal de Alex tiene su propio owner.
export const MOCK_BRANDS: Brand[] = [
  { id: 'b1', name: 'Zara MX', slug: 'zara-mx', profileType: 'brand', logoUrl: null, primaryColor: '#E0A800', ownerId: 'user-cliente-001', categoryId: 'Moda', ayrshareProfileKey: null },
  { id: 'b2', name: 'Nike MX', slug: 'nike-mx', profileType: 'brand', logoUrl: null, primaryColor: '#42A5F5', ownerId: 'user-cliente-001', categoryId: 'Deportes', ayrshareProfileKey: null },
  { id: 'b3', name: 'Spotify MX', slug: 'spotify-mx', profileType: 'brand', logoUrl: null, primaryColor: '#66BB6A', ownerId: 'user-cliente-001', categoryId: 'Entretenimiento', ayrshareProfileKey: null },
  // Perfil Personal — creador de contenido individual, no una marca comercial.
  // Valida que profileType 'personal' funciona con el mismo modelo.
  { id: 'b4', name: 'Alex Rivera', slug: 'alex-rivera', profileType: 'personal', logoUrl: null, primaryColor: '#AB47BC', ownerId: 'user-cliente-002', categoryId: 'Entretenimiento', ayrshareProfileKey: null },
];

export function getBrand(id: string): Brand | undefined {
  return MOCK_BRANDS.find((b) => b.id === id);
}

// ── Cuentas sociales (SocialAccount, antes "BrandProfile") ─────────────────
export const MOCK_SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: 'bp1', brandId: 'b1', socialNetworkId: 'instagram', handle: '@zaramx', followers: 1200000, active: true },
  { id: 'bp2', brandId: 'b1', socialNetworkId: 'linkedin', handle: 'Zara México', followers: 45000, active: true },
  { id: 'bp3', brandId: 'b1', socialNetworkId: 'facebook', handle: 'Zara México', followers: 980000, active: true },
  { id: 'bp4', brandId: 'b2', socialNetworkId: 'tiktok', handle: '@nikemx', followers: 560000, active: true },
  { id: 'bp5', brandId: 'b2', socialNetworkId: 'instagram', handle: '@nikemexico', followers: 2100000, active: true },
  { id: 'bp6', brandId: 'b3', socialNetworkId: 'tiktok', handle: '@spotifymx', followers: 340000, active: true },
  { id: 'bp7', brandId: 'b4', socialNetworkId: 'instagram', handle: '@alexrivera', followers: 45000, active: true },
  { id: 'bp8', brandId: 'b4', socialNetworkId: 'tiktok', handle: '@alexrivera', followers: 92000, active: true },
];

export function getSocialAccount(id: string): SocialAccount | undefined {
  return MOCK_SOCIAL_ACCOUNTS.find((a) => a.id === id);
}

export function getSocialAccountsByBrand(brandId: string): SocialAccount[] {
  return MOCK_SOCIAL_ACCOUNTS.filter((a) => a.brandId === brandId);
}

// ── Campañas ─────────────────────────────────────────────────────────────
// socialAccountIds NO es una relación explícita en modelo.txt (Campaign no
// tiene un join hacia SocialAccount) — en la práctica se infiere de qué
// SocialAccount usa cada Post de la campaña. Se modela aquí como atajo de
// mock (un subconjunto de las cuentas de la marca — p.ej. "Black Friday" solo
// usa Instagram+Facebook de Zara, no LinkedIn) para no tener que derivarlo de
// una lista de posts en cada consumo.
export interface MockCampaignRecord extends Campaign {
  socialAccountIds: string[];
}

// cmId referencia el directorio de CMs local de brands-front
// (MOCK_AVAILABLE_CMS/getCampaignCM) — posts-front no necesita resolver la
// identidad del CM, solo brandId/socialAccountIds para su selector multi-red.
// cmStatus fijo en 'aceptada': estas campañas mock representan un estado ya
// establecido/en marcha (Fase J agregó el flujo de aceptación al modelo
// real, pero el mundo mock no necesita representar el estado "pendiente").
export const MOCK_CAMPAIGNS: MockCampaignRecord[] = [
  { id: 'c1', brandId: 'b1', name: 'Campaña Verano', status: 'active', cmStatus: 'aceptada', startDate: '1 jun', endDate: '31 jul', socialAccountIds: ['bp1', 'bp2', 'bp3'], cmId: 'u1', createdBy: 'user-cliente-001', objective: 'Aumentar el alcance de la colección de verano', description: 'Contenido semanal en Instagram, LinkedIn y Facebook para la temporada de verano.' },
  { id: 'c4', brandId: 'b1', name: 'Black Friday', status: 'paused', cmStatus: 'aceptada', startDate: '1 nov', endDate: '30 nov', socialAccountIds: ['bp1', 'bp3'], cmId: 'u1', createdBy: 'user-cliente-001', objective: 'Impulsar ventas durante Black Friday', description: 'Promociones y contenido de cuenta regresiva para la campaña de descuentos.' },
  { id: 'c2', brandId: 'b2', name: 'Nike Run Launch', status: 'active', cmStatus: 'aceptada', startDate: '15 jun', endDate: '15 ago', socialAccountIds: ['bp4', 'bp5'], cmId: 'u1', createdBy: 'user-cliente-001', objective: 'Lanzar la nueva línea de running', description: 'Reels y posts destacando la nueva colección de calzado deportivo.' },
  { id: 'c3', brandId: 'b3', name: 'Spotify Weekly', status: 'finished', cmStatus: 'aceptada', startDate: '1 ene', endDate: '31 may', socialAccountIds: ['bp6'], cmId: 'u1', createdBy: 'user-cliente-001', objective: 'Mantener presencia semanal constante', description: 'Publicación semanal de playlists destacadas.' },
  { id: 'c5', brandId: 'b4', name: 'Serie Reels diarios', status: 'active', cmStatus: 'aceptada', startDate: '10 jun', endDate: '10 ago', socialAccountIds: ['bp7', 'bp8'], cmId: 'u1', createdBy: 'user-cliente-002', objective: 'Crecer la audiencia con contenido diario', description: 'Serie de reels cortos publicados a diario en Instagram y TikTok.' },
];

export function getCampaign(id: string): MockCampaignRecord | undefined {
  return MOCK_CAMPAIGNS.find((c) => c.id === id);
}

export function getSocialAccountsForCampaign(campaignId: string): SocialAccount[] {
  const campaign = getCampaign(campaignId);
  if (!campaign) return [];
  return campaign.socialAccountIds
    .map((id) => getSocialAccount(id))
    .filter((a): a is SocialAccount => !!a);
}

export function campaignUsesSocialAccount(campaignId: string, socialAccountId: string): boolean {
  return getCampaign(campaignId)?.socialAccountIds.includes(socialAccountId) ?? false;
}
