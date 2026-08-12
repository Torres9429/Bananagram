// setupFiles corre antes de que jest cargue los módulos de cada spec — los
// Prisma Client de auth-service/core-service leen DATABASE_URL_* al importarse,
// así que las env vars tienen que existir antes de cualquier `import`.
const path = require('path');

process.env.DATABASE_URL_AUTH =
  process.env.DATABASE_URL_AUTH || 'postgresql://postgres:postgres@localhost:5433/gestor_redes_auth';
process.env.DATABASE_URL_CORE =
  process.env.DATABASE_URL_CORE || 'postgresql://postgres:postgres@localhost:5433/gestor_redes_core';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

// RS256/JWKS (ADR-0004, supera al HS256 de JWT_SECRET que este archivo
// seteaba antes) — TokenSignerService.onModuleInit() resuelve estas rutas
// con path.resolve() contra process.cwd(), que aquí es apps/backend/test/,
// no la carpeta de auth-service — sin esto, la llave nunca se encuentra y
// cualquier test que firme un JWT (login/register/link-code) truena con
// "Key for the RS256 algorithm... Received undefined". Rutas absolutas para
// no depender de cuántos niveles de "../" haga falta según el cwd real.
process.env.JWT_PRIVATE_KEY_PATH =
  process.env.JWT_PRIVATE_KEY_PATH || path.resolve(__dirname, '../../../keys/jwt_private.pem');
process.env.JWT_PUBLIC_KEY_PATH =
  process.env.JWT_PUBLIC_KEY_PATH || path.resolve(__dirname, '../../../keys/jwt_public.pem');
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'bananagram-auth';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'bananagram-api';
