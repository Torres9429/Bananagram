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
      ],

      // fallback: assets estáticos de cada *-front
      fallback: [
        { source: '/_next/:path*',     destination: `${ZONES.AUTH}/_next/:path*` },
      ],
    };
  },
};

export default nextConfig;
