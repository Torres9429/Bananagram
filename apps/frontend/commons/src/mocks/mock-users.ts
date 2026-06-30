import { AppModule } from '../types/modules.enum';
import { AppAction } from '../types/actions.enum';
import { AppRole } from '../types/roles.enum';

export interface MockUser {
  email: string;
  password: string;
  role: AppRole;
  name: string;
  brandIds: string[];
  permissions: Record<string, string[]>;
}

export const MOCK_USERS: MockUser[] = [
  {
    email: 'admin@bananagram.mx',
    password: 'admin123',
    role: AppRole.ADMINISTRADOR,
    name: 'Laura Méndez',
    brandIds: ['brand-001', 'brand-002'],
    permissions: {
      // Admin administra el catálogo de campañas, NO tiene campañas propias asignadas
      [AppModule.USERS]:     [AppAction.MANAGE],
      [AppModule.BRANDS]:    [AppAction.MANAGE],
      [AppModule.CATALOGS]:  [AppAction.MANAGE],
      [AppModule.POST]:      [AppAction.CREATE, AppAction.SCHEDULE, AppAction.APPROVE, AppAction.REJECT, AppAction.PUBLISH],
      [AppModule.CAMPAIGNS]: [AppAction.MANAGE],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
      [AppModule.REPORTS]:   [AppAction.EXPORT],
    },
  },
  {
    email: 'cm@bananagram.mx',
    password: 'cm123456',
    role: AppRole.COMMUNITY_MANAGER,
    name: 'Ana García',
    brandIds: ['brand-001'],
    permissions: {
      // CM ve SUS campañas asignadas, no administra el catálogo global
      [AppModule.POST]:      [AppAction.CREATE, AppAction.SCHEDULE, AppAction.PUBLISH],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
    },
  },
  {
    email: 'disenador@bananagram.mx',
    password: 'diseno123',
    role: AppRole.DISENADOR,
    name: 'Carlos Ruiz',
    brandIds: ['brand-001'],
    permissions: {
      // Diseñador también participa en campañas asignadas
      [AppModule.POST]:      [AppAction.CREATE],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
    },
  },
  {
    email: 'cliente@bananagram.mx',
    password: 'cliente123',
    role: AppRole.CLIENTE,
    name: 'Roberto Fernández',
    brandIds: ['brand-001', 'brand-002'],
    permissions: {
      [AppModule.POST]:    [AppAction.APPROVE, AppAction.REJECT],
      [AppModule.METRICS]: [AppAction.VIEW],
      [AppModule.SCORE]:   [AppAction.VIEW],
      [AppModule.REPORTS]: [AppAction.EXPORT],
    },
  },
];

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function findUserByEmail(email: string): MockUser | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return MOCK_USERS.find((u) => normalizeEmail(u.email) === normalized) ?? null;
}

export function findUserByCredentials(email: string, password: string): MockUser | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  return user.password === password ? user : null;
}
