/**
 * Denylist de access tokens en Redis, con TTL = vida restante del JWT.
 * Por qué Redis: consulta O(1) en cada request autenticado (aquí y en
 * core-service/alexa-service/gateway); la fila en Postgres es respaldo/
 * auditoría, pero el hot path no debe ir a SQL.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { prisma } from '../prisma/client';

@Injectable()
export class TokenDenylistService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  async revoke(jti: string, expiresAt: Date): Promise<void> {
    const ttlMs = expiresAt.getTime() - Date.now();
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    await prisma.revokedAccessToken.upsert({
      where: { jti },
      create: { jti, expiresAt },
      update: { expiresAt },
    });

    try {
      await this.redis.set(`revoked:access:${jti}`, '1', 'EX', ttlSec);
    } catch {
      // Postgres conserva la revocación durante una caída temporal de Redis.
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const hit = await this.redis.get(`revoked:access:${jti}`);
      if (hit === '1') return true;
    } catch {
      // Redis caído: cae al respaldo en Postgres para no aceptar un token
      // revocado solo porque Redis no respondió.
    }
    return Boolean(
      await prisma.revokedAccessToken.findFirst({
        where: { jti, expiresAt: { gt: new Date() } },
      }),
    );
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
