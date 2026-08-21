import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /metrics aquí
  // Bug real encontrado en vivo (2026-08-21) — ver el comentario completo
  // en admin-front/next.config.ts: sin assetPrefix propio, los chunks JS
  // de esta zona no eran distinguibles de los de las otras 4 y el rewrite
  // "fallback" de web-shell los mandaba todos a auth-front (404).
  assetPrefix: '/analytics-front-static',
};

export default nextConfig;
