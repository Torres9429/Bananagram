/**
 * Redis compartido para rate-limit y para consultar la denylist de access
 * tokens revocados por logout (ver jwt-edge.middleware.ts). El gateway sigue
 * siendo stateless respecto a la identidad — esto es solo estado efímero de
 * protección, no una sesión.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    // Los consumidores (rate-limit, jwt-edge) ya fallan abierto por su cuenta
    // si Redis no responde — pero un error silencioso aquí hace indebuggeable
    // por qué "dejó de limitar", así que sí se loguea (no se relanza).
    this.client.on('error', (error) => this.logger.warn(`Redis error: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
