import { Injectable, Logger } from '@nestjs/common';
import { createCircuitBreaker } from '@repo/backend-commons';

// Primera llamada saliente de core-service hacia auth-service (hasta la
// Fase J solo existía la dirección contraria, auth→core para
// /internal/user-profiles) — mismo patrón que AyrshareService (circuit
// breaker envolviendo el fetch, ver opossum.factory.ts).
//
// Best-effort a propósito: un fallo notificando NUNCA debe impedir que se
// cree/acepte/rechace una campaña — se loguea y se sigue, igual que otros
// efectos secundarios no críticos de esta sesión (ej. seguidores reales en
// el sync de redes sociales).
@Injectable()
export class NotificationsClient {
  private readonly logger = new Logger(NotificationsClient.name);

  async notify(userId: string, type: string, payload?: Record<string, unknown>): Promise<void> {
    const baseUrl = process.env.AUTH_SERVICE_URL;
    if (!baseUrl) {
      this.logger.warn(`AUTH_SERVICE_URL no configurado — no se pudo notificar "${type}" a ${userId}`);
      return;
    }

    // auth-service monta TODAS sus rutas bajo el prefijo global 'api'
    // (app.setGlobalPrefix('api') en su main.ts) — mismo criterio que ya usa
    // el precedente auth→core (auth.service.ts/profile.service.ts llaman a
    // `${coreServiceUrl}/api/internal/user-profiles`, no sin el prefijo).
    const breaker = createCircuitBreaker(async () =>
      fetch(`${baseUrl}/api/internal/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET ?? '' },
        body: JSON.stringify({ userId, type, payload: payload ?? {} }),
      }),
    );

    try {
      const response = (await breaker.fire()) as Response;
      if (!response.ok) {
        this.logger.warn(`No se pudo notificar "${type}" a ${userId}: HTTP ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Error notificando "${type}" a ${userId}: ${error}`);
    }
  }
}
