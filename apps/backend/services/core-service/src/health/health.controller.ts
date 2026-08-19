import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '../prisma/client';

// Mismo criterio que auth-service/src/health/health.controller.ts: público,
// excluido del prefijo 'api' en main.ts, verifica la dependencia real
// (Postgres) en vez de solo confirmar que el proceso responde.
@Controller()
export class HealthController {
  @Get('health')
  async health() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      throw new HttpException(
        { status: 'error', timestamp: new Date().toISOString(), reason: 'No se pudo conectar a la base de datos' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
