/**
 * Rate-limit por IP con ventana fija (INCR + EXPIRE).
 * Por qué propio y no @nestjs/throttler: menos magia, el patrón Redis queda
 * visible, y funciona igual si Redis se comparte entre varias instancias.
 * Por qué primero en la cadena de middlewares: es barato y corta bots antes
 * de gastar una verificación JWKS (ver jwt-edge.middleware.ts).
 * Por qué req.ip y no X-Forwarded-For a mano: ese header lo controla el
 * cliente; leerlo directo permite falsear una IP nueva por request y
 * saltarse el límite. Express solo lo honra si TRUST_PROXY está activo (ver
 * main.ts), es decir, cuando un proxy nuestro (no el cliente) lo escribió.
 */
import { Injectable, Logger, NestMiddleware, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = (req.originalUrl || req.url || req.path || '').split('?')[0];
    // Health no cuenta: se pollea constantemente (Docker, monitoreo).
    if (path === '/health') {
      return next();
    }

    const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
    const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `rl:${ip}`;

    try {
      // SET NX EX + INCR en un pipeline: crear la key ya con su TTL evita que
      // un fallo entre INCR y EXPIRE deje un contador eterno que bloquearía
      // esa IP para siempre.
      const results = (await this.redis.client
        .multi()
        .set(key, 0, 'EX', windowSec, 'NX')
        .incr(key)
        .exec()) as [Error | null, unknown][];
      const count = results[1][1] as number;
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));

      if (count > max) {
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          statusCode: 429,
          message: 'Demasiadas peticiones. Intenta más tarde.',
        });
        return;
      }
    } catch (error) {
      // Si Redis cae, se prioriza disponibilidad sobre estrictez: se deja
      // pasar en vez de tumbar todo el API. Se loguea para poder diferenciar
      // "nadie ha pegado al límite" de "el rate-limit está roto".
      this.logger.warn(`No se pudo aplicar rate-limit (Redis caído/lento?): ${(error as Error).message}`);
    }

    next();
  }
}
