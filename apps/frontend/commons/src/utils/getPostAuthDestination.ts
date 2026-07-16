import { AppRole } from '../types/roles.enum';
import { ZONE_URLS } from '../config/zone-urls';

/**
 * Destino al que debe ir un usuario justo después de autenticarse (login,
 * activación, registro) o al intentar entrar a una ruta que no le
 * corresponde (ej. /dashboard siendo Cliente/CM/Diseñador).
 * Solo Administrador tiene Dashboard — el resto va a su vista de negocio.
 */
export function getPostAuthDestination(role: string): string {
  switch (role) {
    case AppRole.ADMINISTRADOR:
      return `${ZONE_URLS.webShell}/dashboard`;
    case AppRole.CLIENTE:
      return `${ZONE_URLS.brandsFront}/profile`;
    case AppRole.COMMUNITY_MANAGER:
    case AppRole.DISENADOR:
    default:
      return `${ZONE_URLS.brandsFront}/my-campaigns`;
  }
}
