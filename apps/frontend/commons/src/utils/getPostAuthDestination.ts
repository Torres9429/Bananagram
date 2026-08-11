import { AppRole } from '../types/roles.enum';
import { ZONE_URLS } from '../config/zone-urls';

/**
 * Destino al que debe ir un usuario justo después de autenticarse (login,
 * activación, registro) o al intentar entrar a una ruta que no le
 * corresponde (ej. /dashboard siendo Cliente/CM/Diseñador).
 * Solo Administrador tiene Dashboard — el resto va a su vista de negocio.
 */
// Acepta un solo rol (MockUser.role) o varios (AuthUser.roles, multi-rol
// real) — un usuario con varios roles va al destino del más "alto" en esta
// prioridad (Administrador > Cliente > CM/Diseñador).
export function getPostAuthDestination(role: string | string[]): string {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.includes(AppRole.ADMINISTRADOR)) return `${ZONE_URLS.webShell}/dashboard`;
  if (roles.includes(AppRole.CLIENTE)) return `${ZONE_URLS.brandsFront}/profile`;
  return `${ZONE_URLS.brandsFront}/my-campaigns`;
}
