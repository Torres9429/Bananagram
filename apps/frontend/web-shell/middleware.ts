import { NextRequest, NextResponse } from 'next/server';
// Toda la lógica de decisión (decodificar, expiración, intentar refresh)
// vive en commons/src/session/resolve-session-action.ts — se comparte entre
// las 5 zonas. Este archivo solo traduce cookies de Next <-> ese contrato y
// arma la respuesta (Next exige middleware.ts en la raíz de cada app, no se
// puede compartir el archivo en sí).
import { resolveSessionAction } from '@repo/ui/session-middleware';

// Bloqueo de sesión real (login ya conectado a auth-service, ver
// LoginForm.tsx/ADR-0004): sin cookie o con JWT expirado (y sin poder
// renovarlo en silencio vía refresh token), redirige a auth-front en vez de
// servir la página. Solo verifica presencia/expiración del payload
// decodificado, no la firma — la firma la verifica cada microservicio real
// vía JWKS en cada request (gateway + core-service + alexa-service), este
// middleware es una UX de conveniencia, no el enforcement de seguridad real.
// El bloqueo fino por permiso de módulo específico sigue viviendo a nivel de
// página (patrón EmptyState).
const COOKIE_NAME = 'bananagram_token';
const REFRESH_COOKIE_NAME = 'bananagram_refresh_token';

export async function middleware(request: NextRequest) {
  const action = await resolveSessionAction(
    request.cookies.get(COOKIE_NAME)?.value,
    request.cookies.get(REFRESH_COOKIE_NAME)?.value,
  );

  if (action.type === 'allow') {
    return NextResponse.next();
  }

  if (action.type === 'refresh') {
    // Deja pasar la navegación Y renueva las cookies en la misma respuesta
    // — el usuario nunca se entera de que el access token había vencido.
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, action.accessToken, { path: '/', sameSite: 'lax' });
    response.cookies.set(REFRESH_COOKIE_NAME, action.refreshToken, { path: '/', sameSite: 'lax' });
    return response;
  }

  // Relativo al origen de la propia request (nunca ZONE_URLS.authFront
  // directo) — /login en el propio web-shell ya se reescribe server-side
  // hacia auth-front (ver next.config.ts). Bug real encontrado en vivo:
  // ZONE_URLS.authFront es un valor pensado para el proxy DEL SERVIDOR
  // (Docker resuelve nombres de servicio entre contenedores, o incluso IPs
  // privadas entre distintos EC2), pero este redirect lo recibe y lo sigue
  // el NAVEGADOR del usuario — con esa URL nunca es alcanzable fuera de la
  // red interna. Pasaba desapercibido en desarrollo local porque el default
  // (localhost:3012) sí es igual de alcanzable para el navegador que para
  // el servidor, al correr ambos en la misma máquina.
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|public).*)'] };
