import type { BrandScore } from '@repo/ui/types';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { store } from '../store';

export type CampaignStatus = 'active' | 'paused' | 'finished';

// Catálogo de redes sociales disponibles para el onboarding del Cliente.
// Espeja MOCK_SOCIAL_NETWORKS de admin-front sin cruzar microfronts.
export interface SocialNetworkOption {
  code: SocialNetworkCode;
  label: string;
  color: string;
}

// "brand"/"company"/"organization"/"creator" = entidad gestionada por un tercero (Nike, Zara...)
// "personal" = persona (Juan Pérez, Dra. María López...)
// Únicamente afecta cómo se presenta en la UI; el resto del modelo y las
// operaciones (campañas, posts, métricas, score) son exactamente iguales.
export type ProfileType = 'brand' | 'company' | 'organization' | 'creator' | 'personal';

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

export interface MockMyCampaign extends MockCampaign {
  profileName: string;
  profileColor: string;
}

export interface MockTeamAggregate {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
  campaigns: { id: string; name: string; profileName: string }[];
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

export interface CreateCampaignDialogProps {
  open: boolean;
  brandId: string;
  brandCategory: string;
  onClose: () => void;
  onCreate: (campaign: MockCampaign, team: MockTeamMember[]) => void;
}

export interface CampaignCardProps {
  campaign: MockCampaign;
  onClick: () => void;
  // Nombre del perfil dueño de la campaña — solo relevante para quien ve
  // campañas de varios perfiles a la vez (CM/Diseñador en /my-campaigns).
  // El Cliente ya sabe que son las suyas, así que no lo pasa.
  profileName?: string;
}

export interface StaffProfileSectionProps {
  mockProfile: MockAvailableCM | MockAvailableDesigner | null;
  name: string;
  onNameChange: (name: string) => void;
}

export interface CampaignTabsProps {
  brandId: string;
  campaignId: string;
  backHref?: string;
}

export interface ProfileHeaderProps {
  name: string;
  subtitle: string;
}

// Resuelve el título del TopBar por ruta exacta (no solo por el primer
// segmento del path) — necesario porque /profile y sus sub-rutas
// (/profile/calendar, /profile/campaigns/*) representan pantallas distintas
// dentro del mismo dominio de Perfil único. '*' matchea un segmento dinámico
// (ej. el [campaignId] de /profile/campaigns/[campaignId]).
export interface TitleRoute {
  segments: string[];
  title: string;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  networkCode: SocialNetworkCode;
  networkColor: string;
  status: MockCampaignPost['status'];
  postId?: string;
}
