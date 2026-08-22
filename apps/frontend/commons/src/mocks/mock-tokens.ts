import { AppModule } from '../types/modules.enum';
import { AppAction } from '../types/actions.enum';
import { AppRole } from '../types/roles.enum';
import { encodeMockJwt } from '../state/auth.slice';

export const MOCK_TOKENS = {
  admin: encodeMockJwt({
    sub: 'user-admin-001',
    email: 'admin@bananagram.mx',
    name: 'Laura Méndez',
    roles: [AppRole.ADMINISTRADOR],
    status: 'active',
    permissions: {
      [AppModule.USERS]:     [AppAction.VIEW],
      [AppModule.BRANDS]:    [AppAction.VIEW],
      [AppModule.CATALOGS]:  [AppAction.VIEW],
      [AppModule.POST]:      [AppAction.CREATE, AppAction.EDIT, AppAction.APPROVE, AppAction.REJECT, AppAction.EDIT],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
      [AppModule.REPORTS]:   [AppAction.EXPORT],
    },
  }),
  cm: encodeMockJwt({
    sub: 'user-cm-001',
    email: 'cm@bananagram.mx',
    name: 'Ana García',
    roles: [AppRole.COMMUNITY_MANAGER],
    status: 'active',
    // Sin ownedBrandIds: se deriva de Campaign.cmId, no vive en el JWT.
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE, AppAction.EDIT, AppAction.EDIT],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW],
      [AppModule.METRICS]:   [AppAction.VIEW],
      [AppModule.SCORE]:     [AppAction.VIEW],
    },
  }),
  disenador: encodeMockJwt({
    sub: 'user-disenador-001',
    email: 'disenador@bananagram.mx',
    name: 'Carlos Ruiz',
    roles: [AppRole.DISENADOR],
    status: 'active',
    // Sin ownedBrandIds: se deriva de CampaignDesigner, no vive en el JWT.
    permissions: {
      [AppModule.POST]:      [AppAction.CREATE],
      [AppModule.CAMPAIGNS]: [AppAction.VIEW],
    },
  }),
  cliente: encodeMockJwt({
    sub: 'user-cliente-001',
    email: 'cliente@bananagram.mx',
    name: 'Roberto Fernández',
    roles: [AppRole.CLIENTE],
    status: 'active',
    ownedBrandIds: ['brand-001', 'brand-002'],
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
