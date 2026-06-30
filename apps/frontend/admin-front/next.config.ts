import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Multi-zonas: este remote corre en su propio puerto
  // El web-shell redirige /users, /roles, /audit-log, /catalogs/* aquí
  basePath: '',
};

export default nextConfig;
