import { AppRole } from './roles.enum';

// Antes 'activo'/'inactivo' en admin-front — ahora coincide 1:1 con
// User.status de modelo.txt. 'pending' = invitado por Admin, aún sin
// contraseña (el flujo de activación de admin-front ya lo asume).
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  id: string;
  email: string;
  // El JWT real (RS256, multi-rol) no trae name/status — viven en
  // UserProfile (core-service), no en auth-service. setCredentials cae a
  // email como name y a 'active' como status cuando el payload no los trae
  // (un login exitoso ya implica que el backend validó el status).
  name: string;
  roles: string[];
  status: UserStatus;
  avatarUrl?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  permissions: Record<string, string[]>;
  // Solo tiene sentido para Cliente (Brand.ownerId es un único dueño por
  // marca — User.ownedBrands en modelo.txt). Para CM/Diseñador la marca NUNCA
  // vive en la sesión: se deriva en tiempo real de sus campañas asignadas
  // (Campaign.cmId / CampaignDesigner), porque la tabla BrandUser (membership
  // multi-usuario) ya no existe. Ver docs/frontend-db-alignment.md §1.2/§9.1.
  ownedBrandIds: string[];
  isAuthenticated: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  // name/status: solo presentes en el JWT mock (encodeMockJwt) — el JWT real
  // de auth-service no los trae, ver AuthUser.
  name?: string;
  roles: string[];
  status?: UserStatus;
  avatarUrl?: string | null;
  ownedBrandIds?: string[]; // nombre usado por el JWT mock (encodeMockJwt)
  brandIds?: string[]; // nombre real del JWT de auth-service (siempre [] hoy, ver ADR-0004)
  permissions?: Record<string, string[]>;
  exp?: number; // claim estándar JWT (segundos epoch) — usado por web-shell/middleware.ts
}

export interface MockUser {
  id: string;
  email: string;
  password: string;
  role: AppRole;
  name: string;
  status: UserStatus;
  avatarUrl?: string | null;
  ownedBrandIds?: string[]; // solo poblado para Cliente — ver AuthState
  permissions: Record<string, string[]>;
  // Solo tiene sentido para community_manager/disenador — mismo criterio que
  // UserProfile.categories/specialties (core-service). Ausente o vacío en un
  // usuario 'pending' significa "perfil sin completar" (ver ActivateForm).
  categoryIds?: string[];
  specialtyIds?: string[];
}
