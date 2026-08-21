import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /brands/* aquí
  // Bug real encontrado en vivo (2026-08-21) — ver el comentario completo
  // en admin-front/next.config.ts: sin assetPrefix propio, /profile,
  // /my-campaigns, /brands, etc. cargaban el HTML pero sus chunks JS
  // resolvían 404 (el rewrite "fallback" de web-shell los mandaba todos a
  // auth-front) — la app nunca hidrataba, pantallas en blanco o con
  // esqueletos de carga que nunca resuelven.
  assetPrefix: '/brands-front-static',
};

export default nextConfig;
