// setupFiles corre antes de que jest cargue los módulos de cada spec — los
// Prisma Client de auth-service/core-service leen DATABASE_URL_* al importarse,
// así que las env vars tienen que existir antes de cualquier `import`.
process.env.DATABASE_URL_AUTH =
  process.env.DATABASE_URL_AUTH || 'postgresql://postgres:postgres@localhost:5433/gestor_redes_auth';
process.env.DATABASE_URL_CORE =
  process.env.DATABASE_URL_CORE || 'postgresql://postgres:postgres@localhost:5433/gestor_redes_core';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
