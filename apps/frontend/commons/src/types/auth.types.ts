import { AppRole } from './roles.enum';

// Antes 'activo'/'inactivo' en admin-front — ahora coincide 1:1 con
// User.status de modelo.txt. 'pending' = invitado por Admin, aún sin
// contraseña (el flujo de activación de admin-front ya lo asume).
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
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
  name: string;
  role: string;
  status: UserStatus;
  avatarUrl?: string | null;
  ownedBrandIds?: string[]; // solo poblado para Cliente — ver AuthState
  permissions?: Record<string, string[]>;
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
}
