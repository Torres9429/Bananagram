import { PrismaClient } from '../../node_modules/.prisma-client';

// Mismo motivo que core-service/auth-service (ver comentario ahí): clave de
// global distinta ('prismaAlexa') para que dos procesos que compartan el
// mismo `global` (p. ej. un test) no reutilicen por error la instancia de
// otro servicio.
const globalForPrisma = global as unknown as { prismaAlexa: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prismaAlexa ||
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaAlexa = prisma;

export default prisma;
