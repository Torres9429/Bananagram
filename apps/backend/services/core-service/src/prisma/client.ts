import { PrismaClient } from '../../node_modules/.prisma-client';

// Clave de global distinta de la de auth-service (`prismaAuth`) a propósito:
// ambos client.ts usaban `global.prisma` por igual, así que si los dos
// procesos se cargan en el mismo proceso de Node (p. ej. un test que importa
// ambos servicios) el segundo en cargar reutilizaba por error la instancia
// del primero — mismo objeto `global`, misma key, PrismaClient equivocado.
const globalForPrisma = global as unknown as { prismaCore: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prismaCore ||
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaCore = prisma;

export default prisma;