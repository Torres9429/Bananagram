import type { BrandScore, ProfileType, SocialNetworkCode, SocialAccount, SocialNetworkOption } from '@repo/ui/types';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { MyUserProfile } from '@repo/ui/state';
import type { store } from '../store';

export type { ProfileType, SocialNetworkCode };

export type CampaignStatus = 'active' | 'paused' | 'finished';

// Catálogo de redes sociales y SocialAccount ahora se importan directo de
// @repo/ui/types (mock-world.ts) — antes eran interfaces locales casi
// idénticas (mismos campos) mantenidas por separado en brands-front, lo que
// permitía que este app y posts-front divergieran en shape. Se re-exportan
// con el mismo nombre para no tocar los ~10 call-sites que las importan
// desde './interfaces/interface' (ver docs/frontend-db-alignment §7).
export type { SocialNetworkOption, SocialAccount };

// Representa Brand (modelo.txt). "brand"/"company"/"organization"/"creator" =
// entidad gestionada por un tercero (Nike, Zara...); "personal" = persona
// (Juan Pérez, Dra. María López...). Únicamente afecta cómo se presenta en la
// UI; el resto del modelo y las operaciones (campañas, posts, métricas,
// score) son exactamente iguales — ver PROFILE_TYPES/ProfileType en
// @repo/ui/types (fuente canónica, ya no se duplica el union aquí).
export interface MockProfile {
  id: string;
  name: string;
  profileType: string | null;
  color: string;
  categoryId: string;
  activeCampaigns: number;
  score: BrandScore;
  socialAccounts: SocialAccount[];
  ownerId: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
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
  objective?: string | null;
  description?: string | null;
  createdBy: string; // FK -> users.id del Cliente que creó la campaña (ya NO es "team")
  cmId: string; // FK única — un solo CM por campaña, ver MOCK_AVAILABLE_CMS
}

// Representa un Diseñador asignado a una campaña (CampaignDesigner join, sin
// campo de rol propio). El CM ya NO se modela con esto — vive en
// MockCampaign.cmId (relación 1, no una lista) — ver
// docs/frontend-db-alignment.md §1.2/§9.7. `role` se conserva solo como label
// de presentación ("Diseñador"), no como discriminador de tipo.
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
  socialAccountId: string;
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
  socialAccountId: string;
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
  // El CM ya no es un "team member" (viaja en MockCampaign.cmId) — designers
  // es la lista de Diseñadores elegidos (CampaignDesigner), sin el CM ni el
  // Cliente mezclados adentro.
  onCreate: (campaign: MockCampaign, designers: MockTeamMember[]) => void;
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
  // null = perfil real todavía no existe (usuario dado de alta por el
  // Admin, nunca completó nada) — el formulario arranca en blanco.
  profile: MyUserProfile | null;
  name: string;
  onNameChange: (name: string) => void;
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
