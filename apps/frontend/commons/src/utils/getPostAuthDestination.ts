import { AppRole } from '../types/roles.enum';

// Único lugar con los puertos de destino post-auth — evita repetir estas
// URLs en LoginForm/RegisterForm/ActivateForm/la landing/`/dashboard`.
const WEB_SHELL_URL = 'http://localhost:3000';
const BRANDS_FRONT_URL = 'http://localhost:3013';

/**
 * Destino al que debe ir un usuario justo después de autenticarse (login,
 * activación, registro) o al intentar entrar a una ruta que no le
 * corresponde (ej. /dashboard siendo Cliente/CM/Diseñador).
 * Solo Administrador tiene Dashboard — el resto va a su vista de negocio.
 */
export function getPostAuthDestination(role: string): string {
  switch (role) {
    case AppRole.ADMINISTRADOR:
      return `${WEB_SHELL_URL}/dashboard`;
    case AppRole.CLIENTE:
      return `${BRANDS_FRONT_URL}/profile`;
    case AppRole.COMMUNITY_MANAGER:
    case AppRole.DISENADOR:
    default:
      return `${BRANDS_FRONT_URL}/my-campaigns`;
  }
}
