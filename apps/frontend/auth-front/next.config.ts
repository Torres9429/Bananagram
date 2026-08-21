import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /login, /register, /forgot-password, /reset-password aquí
  // Bug real encontrado en vivo (2026-08-21) — ver el comentario completo
  // en admin-front/next.config.ts: antes de este fix, el rewrite
  // "fallback" de web-shell mandaba TODOS los chunks JS de cualquier zona
  // acá (a auth-front), sin importar quién los pedía de verdad —
  // funcionaba por pura coincidencia para /login (porque efectivamente es
  // esta zona), pero rompía a las otras 4. Con assetPrefix propio en las 5
  // zonas, cada una pide sus chunks por su ruta real.
  assetPrefix: '/auth-front-static',
};

export default nextConfig;
