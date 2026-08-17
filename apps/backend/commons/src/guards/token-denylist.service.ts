import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// De solo lectura — antes duplicada byte por byte en core-service y
// alexa-service (confirmado al revivir este paquete). auth-service (el
// emisor) sigue con su propia copia local, que además ESCRIBE la
// revocación con respaldo en Postgres — no se comparte, es una
// responsabilidad distinta (emisor vs. verificadores).
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
