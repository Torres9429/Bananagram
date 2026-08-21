import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /posts/* y /approvals aquí
  // Bug real encontrado en vivo (2026-08-21) — ver el comentario completo
  // en admin-front/next.config.ts: sin assetPrefix propio, sus chunks JS
  // resolvían 404 vía el proxy de web-shell (mandaba todo a auth-front).
  assetPrefix: '/posts-front-static',
};

export default nextConfig;
