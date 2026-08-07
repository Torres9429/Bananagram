import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Solo lectura: core-service nunca revoca tokens (eso es privilegio de
// auth-service, el emisor). Si Redis está caído, isRevoked() falla abierto
// (devuelve false) — mismo criterio de disponibilidad que el rate-limit del
// gateway: se prioriza que el servicio siga respondiendo sobre una denylist
// estricta que dependa de un componente adicional.
@Injectable()
export class TokenDenylistService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 3,
  });

  async isRevoked(jti: string): Promise<boolean> {
    try {
      return (await this.redis.get(`revoked:access:${jti}`)) === '1';
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
