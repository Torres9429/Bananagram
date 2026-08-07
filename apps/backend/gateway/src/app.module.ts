import { Module } from '@nestjs/common';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { HealthController } from './health/health.controller';
import { RedisModule } from './redis/redis.module';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { JwtEdgeMiddleware } from './auth/jwt-edge.middleware';

// Los middlewares ya NO se registran vía configure()/MiddlewareConsumer —
// ver main.ts. Se listan aquí como providers normales solo para que
// app.get(...) pueda resolverlos con sus dependencias (RedisService) ya
// inyectadas, y montarlos a mano en el orden correcto antes de los proxies.
@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [RateLimitMiddleware, JwtEdgeMiddleware, CorrelationIdMiddleware],
})
export class AppModule {}
