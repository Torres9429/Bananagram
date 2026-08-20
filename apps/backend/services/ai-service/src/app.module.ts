import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from './auth/jwt-auth.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health/health.controller';
import { PayloadTooLargeFilter } from './common/payload-too-large.filter';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtAuthModule, AiModule],
  controllers: [HealthController],
  // APP_FILTER (no app.useGlobalFilters() en main.ts) a propósito:
  // PayloadTooLargeFilter extiende BaseExceptionFilter, que necesita
  // HttpAdapterHost inyectado por Nest para su fallback (super.catch()) —
  // solo pasa por DI si se registra como provider, ver comentario en el filtro.
  providers: [{ provide: APP_FILTER, useClass: PayloadTooLargeFilter }],
})
export class AppModule {}
