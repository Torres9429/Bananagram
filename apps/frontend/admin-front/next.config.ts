import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /users, /roles, /audit-log, /catalogs/* aquí
  basePath: '',
  // Bug real encontrado en vivo (2026-08-21): sin assetPrefix, esta zona y
  // las otras 4 sirven sus _next/static/* bajo la MISMA ruta sin prefijo
  // (/_next/static/chunks/HASH.js) — el rewrite "fallback" de
  // web-shell/next.config.ts no puede distinguir a qué zona pertenece cada
  // chunk (la URL no lo dice) y termina mandando TODOS los assets a
  // auth-front. Cualquier página de OTRA zona (ej. /users acá) cargaba HTML
  // pero sus propios chunks JS resolvían 404 vía el proxy — la app nunca
  // hidrataba (pantalla en blanco / esqueletos que nunca cargan, sin error
  // visible en consola porque un <script> con 404 no lanza excepción JS).
  // assetPrefix pone un prefijo único en las URLs de assets que el HTML
  // genera, así web-shell puede rutear cada uno a su zona real — ver los
  // 5 rewrites nuevos en next.config.ts. No afecta basePath ni las rutas
  // reales de las páginas (/users sigue siendo /users).
  assetPrefix: '/admin-front-static',
};

export default nextConfig;
