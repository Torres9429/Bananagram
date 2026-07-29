import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';

// Mismo patrón que core-service/src/auth/jwt-auth.module.ts: solo necesita
// validar el token que la Alexa Skill reenvía como Bearer (obtenido por el
// usuario al vincular su cuenta), no emitirlo.
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class JwtAuthModule {}
