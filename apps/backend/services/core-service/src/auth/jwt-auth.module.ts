import { Global, Module } from '@nestjs/common';
import { TokenDenylistService } from '@repo/backend-commons';

// @Global(): JwtAuthGuard se usa vía @UseGuards(JwtAuthGuard) en controllers
// de módulos que no siempre importan este módulo (p.ej. InternalModule) —
// antes funcionaba en cualquier lado porque passport registra su estrategia
// 'jwt' en un singleton global del proceso, fuera de la DI de Nest. Con DI
// pura (sin passport), TokenDenylistService necesita estar disponible en
// TODO módulo que use el guard, así que se declara global una sola vez aquí,
// importado desde AppModule.
@Global()
@Module({
  providers: [TokenDenylistService],
  exports: [TokenDenylistService],
})
export class JwtAuthModule {}
