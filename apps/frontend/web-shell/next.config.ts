import type { NextConfig } from 'next';
import { ZONE_URLS } from '@repo/ui/config';

const ZONES = {
  AUTH:      ZONE_URLS.authFront,
  ADMIN:     ZONE_URLS.adminFront,
  BRANDS:    ZONE_URLS.brandsFront,
  POSTS:     ZONE_URLS.postsFront,
  ANALYTICS: ZONE_URLS.analyticsFront,
};

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles: rutas que el shell maneja él mismo (dashboard)
      beforeFiles: [],

      // afterFiles: rutas que se delegan a cada *-front
      afterFiles: [
        // auth-front
        { source: '/login',            destination: `${ZONES.AUTH}/login` },
        { source: '/register',         destination: `${ZONES.AUTH}/register` },
        { source: '/forgot-password',  destination: `${ZONES.AUTH}/forgot-password` },
        { source: '/reset-password',   destination: `${ZONES.AUTH}/reset-password` },

        // admin-front
        { source: '/users',            destination: `${ZONES.ADMIN}/users` },
        { source: '/roles',            destination: `${ZONES.ADMIN}/roles` },
        { source: '/audit-log',        destination: `${ZONES.ADMIN}/audit-log` },
        { source: '/catalogs/:path*',  destination: `${ZONES.ADMIN}/catalogs/:path*` },

        // brands-front
        { source: '/brands',           destination: `${ZONES.BRANDS}/brands` },
        { source: '/brands/:path*',    destination: `${ZONES.BRANDS}/brands/:path*` },
        { source: '/my-campaigns',     destination: `${ZONES.BRANDS}/my-campaigns` },
        { source: '/team',             destination: `${ZONES.BRANDS}/team` },
        // Faltaba (gap real encontrado en vivo, 2026-08-21): el Sidebar de
        // analytics-front/posts-front ya navegaba a /my-team con
        // navegación dura (ver Sidebar.tsx de cada zona), pero sin este
        // rewrite esa ruta no la resuelve nadie fuera de brands-front
        // mismo (404 al llegar por el proxy de web-shell).
        { source: '/my-team',          destination: `${ZONES.BRANDS}/my-team` },
        // /profile no tenía rewrite — solo era alcanzable entrando directo a
        // brands-front:3013 (gap ya documentado en sesiones anteriores, se
        // cierra de paso al agregar /profile/alexa).
        { source: '/profile',          destination: `${ZONES.BRANDS}/profile` },
        { source: '/profile/:path*',   destination: `${ZONES.BRANDS}/profile/:path*` },

        // posts-front
        { source: '/posts',            destination: `${ZONES.POSTS}/posts` },
        { source: '/posts/:path*',     destination: `${ZONES.POSTS}/posts/:path*` },
        { source: '/approvals',        destination: `${ZONES.POSTS}/posts/approvals` },

        // analytics-front
        { source: '/metrics',          destination: `${ZONES.ANALYTICS}/metrics` },

        // Bug real encontrado en vivo (2026-08-21): el único rewrite de
        // /_next/* que había (ver "fallback" más abajo) mandaba TODOS los
        // assets estáticos a auth-front sin importar qué zona los pidiera
        // de verdad — la URL de un chunk (/_next/static/chunks/HASH.js) no
        // dice a qué zona pertenece. Cualquier página de una zona que no
        // fuera auth-front cargaba el HTML pero sus propios chunks JS
        // resolvían 404 vía este proxy, así que la app nunca hidrataba
        // (pantalla en blanco / esqueletos que nunca cargan, sin error
        // visible en consola porque un <script> con 404 no lanza excepción
        // JS — solo se nota mirando la pestaña Network). Fix: cada zona
        // ahora declara su propio `assetPrefix` (ver next.config.ts de
        // cada una) — el HTML que arma cada zona pide sus assets bajo un
        // path único, así que acá sí podemos rutear cada uno a su zona
        // real en vez de adivinar.
        { source: '/admin-front-static/_next/:path*',     destination: `${ZONES.ADMIN}/admin-front-static/_next/:path*` },
        { source: '/analytics-front-static/_next/:path*', destination: `${ZONES.ANALYTICS}/analytics-front-static/_next/:path*` },
        { source: '/auth-front-static/_next/:path*',      destination: `${ZONES.AUTH}/auth-front-static/_next/:path*` },
        { source: '/brands-front-static/_next/:path*',    destination: `${ZONES.BRANDS}/brands-front-static/_next/:path*` },
        { source: '/posts-front-static/_next/:path*',     destination: `${ZONES.POSTS}/posts-front-static/_next/:path*` },
      ],

      // fallback: último recurso para /_next/* sin prefijo de zona — ya no
      // debería alcanzarse en la práctica una vez que las 5 zonas usan su
      // propio assetPrefix (ver arriba), pero se deja como default inerte
      // en vez de borrarlo, por si queda alguna referencia vieja cacheada
      // en un navegador de una build anterior a este fix.
      fallback: [
        { source: '/_next/:path*',     destination: `${ZONES.AUTH}/_next/:path*` },
      ],
    };
  },
};

export default nextConfig;
