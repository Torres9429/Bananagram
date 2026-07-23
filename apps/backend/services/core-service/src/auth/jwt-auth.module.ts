import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';

// Módulo mínimo para que JwtAuthGuard (AuthGuard('jwt')) tenga una estrategia
// 'jwt' registrada — core-service no tiene login propio (eso vive en
// auth-service), solo necesita poder VALIDAR el token que auth-service ya
// emitió. Cualquier módulo de dominio que proteja endpoints con JwtAuthGuard
// debe importar este módulo.
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class JwtAuthModule {}
