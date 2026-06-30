import type { NextConfig } from 'next';

const ZONES = {
  AUTH:      'http://localhost:3012',
  ADMIN:     'http://localhost:3010',
  BRANDS:    'http://localhost:3013',
  POSTS:     'http://localhost:3014',
  ANALYTICS: 'http://localhost:3011',
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
