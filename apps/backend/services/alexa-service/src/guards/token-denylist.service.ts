import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Mismo patrón que core-service/src/guards/token-denylist.service.ts:
// solo lectura, falla abierto si Redis está caído.
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
