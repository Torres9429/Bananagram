import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /login, /register, /forgot-password, /reset-password aquí
};

export default nextConfig;
