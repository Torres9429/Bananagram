import { AppRole } from '../types/roles.enum';

/**
 * Destino al que debe ir un usuario justo después de autenticarse (login,
 * activación, registro) o al intentar entrar a una ruta que no le
 * corresponde (ej. /dashboard siendo Cliente/CM/Diseñador).
 * Solo Administrador tiene Dashboard — el resto va a su vista de negocio.
 */
// Acepta un solo rol (MockUser.role) o varios (AuthUser.roles, multi-rol
// real) — un usuario con varios roles va al destino del más "alto" en esta
// prioridad (Administrador > Cliente > CM/Diseñador).
//
// Ruta RELATIVA a propósito (nunca ZONE_URLS.X directo) — todos los
// llamadores hacen window.location.href = getPostAuthDestination(...) (o un
// redirect() de servidor equivalente), y esa navegación la sigue el
// navegador o el proxy server-side de web-shell (ver next.config.ts
// rewrites), nunca directo a otro origen. Bug real encontrado en vivo:
// ZONE_URLS.brandsFront/webShell son valores pensados para resolución
// interna (Docker o localhost en dev), no alcanzables desde el navegador en
// ningún despliegue real — mismo hallazgo que middleware.ts.
export function getPostAuthDestination(role: string | string[]): string {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.includes(AppRole.ADMINISTRADOR)) return '/dashboard';
  if (roles.includes(AppRole.CLIENTE)) return '/profile';
  return '/my-campaigns';
}
