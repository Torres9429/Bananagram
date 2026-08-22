import type { SidebarNavItem } from '@repo/ui/ui';
import type { AppRole, UserStatus } from '@repo/ui/types';
import type { store } from '../store';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  lastLogin: string;
}

export interface MockCatalogItem {
  id: string;
  name: string;
  status: 'activo' | 'inactivo';
}

export interface CreatedUser {
  name: string;
  email: string;
  activationUrl: string;
}

// Privilegios reales del sistema (AppModule × AppAction).
// Fuente de verdad: commons/src/types/modules.enum.ts + actions.enum.ts.
// El backend los persiste en role_permissions; aquí son solo mock de visualización/edición.
export const MODULES = ['users', 'brands', 'catalogs', 'post', 'campaigns', 'metrics', 'score', 'reports'] as const;
export const ACTIONS = ['manage', 'create', 'view', 'view-own', 'schedule', 'approve', 'reject', 'publish', 'export'] as const;

export type Module = typeof MODULES[number];
export type Action = typeof ACTIONS[number];
export type PrivilegeMap = Record<Module, Action[]>;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

export interface CatalogListProps {
  title: string;
  items: MockCatalogItem[];
}

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (user: MockUser) => void;
}
