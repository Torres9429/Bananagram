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
  // directo) — bug real encontrado en vivo (2026-08-21): cuando web-shell
  // renueva el access token en su propio middleware (rama "refresh" de
  // arriba), esa cookie nueva solo queda en la respuesta que vuelve al
  // navegador — el rewrite server-to-server hacia esta zona sigue llevando
  // la cookie VIEJA de la request original. Esta zona entonces evalúa esa
  // cookie vieja como inválida y cae en este redirect — con
  // ZONE_URLS.authFront terminaba mandando al usuario a localhost:3012,
  // inalcanzable fuera de dev local. Mismo hallazgo que
  // web-shell/middleware.ts, aplicado acá porque SÍ se demostró alcanzable
  // en producción (no es código muerto como se asumió al principio).
  return NextResponse.redirect(new URL('/login', request.url));
}

// Bug real encontrado en vivo (mismo hallazgo en web-shell/middleware.ts):
// "public" en este patrón excluye la RUTA literal /public/*, que no existe
// — Next.js sirve los archivos de public/ en la RAÍZ (ej. public/Logo.png
// -> /Logo.png). Sin una exclusión por extensión de archivo, next/image
// pidiéndose a sí mismo la imagen fuente sin sesión activa se topaba con
// este middleware y recibía un redirect a /login en vez del PNG.
export const config = { matcher: ['/((?!api|_next|favicon.ico|public|.*\\.[a-zA-Z0-9]+$).*)'] };
