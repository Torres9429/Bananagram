import { AppModule } from '../types/modules.enum';
import { AppAction } from '../types/actions.enum';
import { AppRole } from '../types/roles.enum';
import type { MockUser } from '../types/auth.types';

export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-admin-001',
    email: 'admin@bananagram.mx',
    password: 'admin123',
    role: AppRole.ADMINISTRADOR,
    name: 'Laura Méndez',
    status: 'active',
    // Admin administra el catálogo global vía permisos, no es dueño de marcas
    // (Brand.ownerId siempre es un Cliente) — ver docs/frontend-db-alignment.md §1.2.
    permissions: {
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
    id: 'user-cm-001',
    email: 'cm@bananagram.mx',
    password: 'cm123456',
    role: AppRole.COMMUNITY_MANAGER,
    name: 'Ana García',
    status: 'active',
    // Sin ownedBrandIds: un CM no es dueño de marca. Su marca se deriva en
    // tiempo real de sus campañas asignadas (Campaign.cmId), nunca es un
    // campo de sesión — ver docs/frontend-db-alignment.md §1.2/§9.1.
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE, AppAction.SCHEDULE, AppAction.PUBLISH],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
    },
  },
  {
    id: 'user-disenador-001',
    email: 'disenador@bananagram.mx',
    password: 'diseno123',
    role: AppRole.DISENADOR,
    name: 'Carlos Ruiz',
    status: 'active',
    // Sin ownedBrandIds — mismo caso que CM: se deriva de CampaignDesigner.
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
    },
  },
  {
    id: 'user-cliente-001',
    email: 'cliente@bananagram.mx',
    password: 'cliente123',
    role: AppRole.CLIENTE,
    name: 'Roberto Fernández',
    status: 'active',
    ownedBrandIds: ['brand-001', 'brand-002'],
    permissions: {
      // Permite iniciar el onboarding: crear/elegir campaña + CM (ver MD 6.2).
      // No es 'view-own' (eso es para CM/Diseñador viendo campañas ya asignadas).
      [AppModule.POST]:      [AppAction.APPROVE, AppAction.REJECT],
      [AppModule.CAMPAIGNS]: [AppAction.CREATE],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
      [AppModule.REPORTS]:   [AppAction.EXPORT],
    },
  },
  {
    // Segundo Cliente, profileType 'personal' (§Parte C del rediseño de
    // dominio) — valida que el modelo de Perfil único funciona igual de bien
    // para un creador de contenido individual que para una marca comercial.
    // Mismos permisos que el Cliente existente — ningún permiso nuevo.
    id: 'user-cliente-002',
    email: 'alex@bananagram.mx',
    password: 'alex12345',
    role: AppRole.CLIENTE,
    name: 'Alex Rivera',
    status: 'active',
    ownedBrandIds: ['brand-004'],
    permissions: {
      [AppModule.POST]:      [AppAction.APPROVE, AppAction.REJECT],
      [AppModule.CAMPAIGNS]: [AppAction.CREATE],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
      [AppModule.REPORTS]:   [AppAction.EXPORT],
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
