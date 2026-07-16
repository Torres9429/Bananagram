import { AppRole } from './roles.enum';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  permissions: Record<string, string[]>;
  brandIds: string[];
  isAuthenticated: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  brandIds?: string[];
  permissions?: Record<string, string[]>;
}

export interface MockUser {
  email: string;
  password: string;
  role: AppRole;
  name: string;
  brandIds: string[];
  permissions: Record<string, string[]>;
}
