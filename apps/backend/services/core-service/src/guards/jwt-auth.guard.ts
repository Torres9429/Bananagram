/**
 * Verifica firma RS256 contra el JWKS remoto de auth-service (jose cachea
 * las llaves solo, sin cache manual) y consulta la denylist antes de aceptar
 * el token. Reemplaza el AuthGuard('jwt') de passport-jwt (secreto
 * compartido): core-service nunca firma, solo verifica lo que auth-service
 * emitió.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { TokenDenylistService } from './token-denylist.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks = createRemoteJWKSet(
    new URL(process.env.AUTH_JWKS_URL ?? 'http://localhost:3001/.well-known/jwks.json'),
  );

  constructor(private readonly denylist: TokenDenylistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer requerido');
    }

    try {
      const { payload } = await jwtVerify(header.slice(7), this.jwks, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
      // Sin jti no hay nada que revocar: un token así sería inmune al logout.
      if (!payload.jti) {
        throw new UnauthorizedException('Token sin jti: no es revocable');
      }
      if (await this.denylist.isRevoked(payload.jti)) {
        throw new UnauthorizedException('Token revocado');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
