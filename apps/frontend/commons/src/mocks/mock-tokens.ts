import { AppModule } from '../types/modules.enum';
import { AppAction } from '../types/actions.enum';
import { AppRole } from '../types/roles.enum';

function encodeMockJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
}

export const MOCK_TOKENS = {
  admin: encodeMockJwt({
    sub: 'user-admin-001',
    email: 'admin@bananagram.mx',
    role: AppRole.ADMINISTRADOR,
    brandIds: ['brand-001', 'brand-002'],
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
  }),
  cm: encodeMockJwt({
    sub: 'user-cm-001',
    email: 'cm@bananagram.mx',
    role: AppRole.COMMUNITY_MANAGER,
    brandIds: ['brand-001'],
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE, AppAction.SCHEDULE, AppAction.PUBLISH],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
    },
  }),
  disenador: encodeMockJwt({
    sub: 'user-disenador-001',
    email: 'disenador@bananagram.mx',
    role: AppRole.DISENADOR,
    brandIds: ['brand-001'],
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW_OWN],
    },
  }),
  cliente: encodeMockJwt({
    sub: 'user-cliente-001',
    email: 'cliente@bananagram.mx',
    role: AppRole.CLIENTE,
    brandIds: ['brand-001', 'brand-002'],
    permissions: {
      [AppModule.POST]:      [AppAction.APPROVE, AppAction.REJECT],
      [AppModule.CAMPAIGNS]: [AppAction.CREATE],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
      [AppModule.REPORTS]:   [AppAction.EXPORT],
    },
  }),
};

export type MockRole = keyof typeof MOCK_TOKENS;
