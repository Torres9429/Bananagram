import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '../prisma/client';

// Mismo criterio que auth-service/src/health/health.controller.ts. La
// conexión que verifica es la misma BD física de core-service
// (DATABASE_URL_CORE, ver prisma/schema.prisma de este servicio) —
// alexa-service no migra ese schema, pero sí depende de que esa base
// responda para todo su dominio de ideas.
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
