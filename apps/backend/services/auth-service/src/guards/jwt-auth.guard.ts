/**
 * Verifica firma RS256 con la llave local (propia, no JWKS remoto — este
 * servicio es el emisor) y consulta la denylist antes de aceptar el token.
 * Reemplaza el AuthGuard('jwt') de passport-jwt: ya no hace falta una
 * estrategia registrada globalmente, el guard verifica directo.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenSignerService } from '../auth/token-signer.service';
import { TokenDenylistService } from '../auth/token-denylist.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenSignerService,
    private readonly denylist: TokenDenylistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer requerido');
    }

    try {
      const payload = await this.tokens.verifyAccess(header.slice(7));
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
