import { Controller, Get } from '@nestjs/common';

// Sin base de datos propia (ai-service es stateless) — no hay una
// dependencia local que verificar, así que este check se queda tan simple
// como el del gateway (confirma que el proceso responde). No se llama a
// OpenRouter acá: sería un health check costoso y lento, no lo que se
// espera de un liveness probe.
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
