/**
 * Validación JWT en el edge, contra el JWKS remoto de auth-service.
 * Por qué aquí: rechaza tokens inválidos antes de proxyear (ahorro y
 * política uniforme para todos los servicios detrás del gateway).
 * Por qué createRemoteJWKSet: jose cachea las llaves; no se descarga el JWKS
 * en cada request.
 * Por qué los backends igual re-validan: defensa en profundidad — si algo
 * bypasea el gateway en la red interna (Docker), el servicio destino no
 * confía ciegamente en que ya se validó antes (ver Fases 1-3 del plan).
 * Por qué la denylist también aquí: cada backend verifica solo firma más su
 * propia denylist; consultarla también en el edge hace que un logout corte
 * el acceso a TODOS los servicios de inmediato.
 */
import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { RedisService } from '../redis/redis.service';

// Rutas públicas de auth-service alcanzables a través del gateway (todas bajo
// /api porque cada servicio registra app.setGlobalPrefix('api')). El logout
// de Bananagram, a diferencia de ControlAcceso, se queda PROTEGIDO (decisión
// ya tomada) — necesita un access token válido para poder revocar su jti.
const PUBLIC_EXACT = new Set([
  '/health',
  '/favicon.ico',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/password-reset/request',
  '/api/auth/password-reset/confirm',
]);

@Injectable()
export class JwtEdgeMiddleware implements NestMiddleware {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly redis: RedisService) {}

  private getJwks() {
    if (!this.jwks) {
      const url = process.env.AUTH_JWKS_URL ?? 'http://localhost:3001/.well-known/jwks.json';
      this.jwks = createRemoteJWKSet(new URL(url));
    }
    return this.jwks;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const path = (req.originalUrl || req.url || req.path || '').split('?')[0];
    if (req.method === 'OPTIONS' || PUBLIC_EXACT.has(path)) {
      return next();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: 401,
        message: 'Token Bearer requerido',
      });
      return;
    }

    const token = header.slice('Bearer '.length);
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        algorithms: ['RS256'],
        // iss/aud cierran el reuso de tokens de otro emisor o para otra audiencia.
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
      // Sin jti no hay nada que revocar: un token así sería inmune al
      // logout, así que se rechaza en vez de dejarlo pasar (fail-closed).
      if (!payload.jti) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          statusCode: 401,
          message: 'Token sin jti: no es revocable',
        });
        return;
      }
      if (await this.isRevoked(payload.jti)) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          statusCode: 401,
          message: 'Token revocado (logout)',
        });
        return;
      }
      // El proxy reenvía el Authorization original tal cual para que el
      // servicio destino re-valide — esto solo cuelga el payload por si un
      // middleware posterior lo necesita.
      (req as Request & { user?: unknown }).user = payload;
      next();
    } catch {
      res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: 401,
        message: 'Token inválido o expirado',
      });
    }
  }

  private async isRevoked(jti: string): Promise<boolean> {
    try {
      return (await this.redis.client.get(`revoked:access:${jti}`)) === '1';
    } catch {
      // Redis caído: degrada a solo-firma, mismo criterio fail-open que el rate-limit.
      return false;
    }
  }
}
