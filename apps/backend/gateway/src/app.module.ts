import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { HealthController } from './health/health.controller';
import { RedisModule } from './redis/redis.module';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { JwtEdgeMiddleware } from './auth/jwt-edge.middleware';

// Los middlewares ya NO se registran vía configure()/MiddlewareConsumer —
// ver main.ts. Se listan aquí como providers normales solo para que
// app.get(...) pueda resolverlos con sus dependencias (RedisService) ya
// inyectadas, y montarlos a mano en el orden correcto antes de los proxies.
//
// ConfigModule.forRoot() carga .env desde el cwd del proceso (la propia
// carpeta del gateway) — antes dependía de que Turborepo lo inyectara
// implícito al correr `pnpm dev`, que no aplica si se arranca de otra forma
// (node dist/main en producción) — mismo criterio que los demás servicios.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule],
  controllers: [HealthController],
  providers: [RateLimitMiddleware, JwtEdgeMiddleware, CorrelationIdMiddleware],
})
export class AppModule {}
