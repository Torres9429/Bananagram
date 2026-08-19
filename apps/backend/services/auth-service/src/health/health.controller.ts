import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '../prisma/client';

// Público a propósito (excluido del prefijo 'api' en main.ts, mismo criterio
// que .well-known/jwks.json) — lo consultan herramientas de infraestructura
// (Docker healthcheck, orquestador), no un cliente autenticado. A diferencia
// del /health del gateway (que solo confirma que el proceso responde), este
// sí verifica la dependencia real del servicio: sin Postgres, auth-service
// no puede emitir tokens, así que "vivo pero sin BD" debe reportarse como
// no saludable (503), no como 200.
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
