import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.issueTokens(user);
  }

  async refresh(token: string) {
    const rt = await this.repo.findRefreshToken(token);
    if (!rt || rt.usedAt || rt.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    await this.repo.markTokenUsed(rt.id);
    return this.issueTokens(rt.user);
  }

  // Compartido por login() y refresh() — antes refresh() volvía a llamar a
  // login() con password: '' para "reutilizar" la emisión de tokens, lo cual
  // siempre fallaba el bcrypt.compare (además de quemar el refresh token
  // viejo aunque la emisión fallara). Aquí no hay verificación de contraseña
  // porque para cuando se llega a este punto ya se validó identidad
  // (password correcto en login, o refresh token válido/sin usar en refresh).
  private async issueTokens(user: { id: string; email: string; roleId: string; role: { name: string } }) {
    const permissions = await this.repo.getPermissions(user.roleId);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      // Bajo el modelo separado (docs/base/modelo2.txt) Brand/Campaign viven
      // en la base de core-service — auth-service ya no puede resolver
      // brandIds con un join local, y ya NO se intenta: queda siempre vacío
      // a propósito. Decisión tomada: BrandAccessGuard vive y se aplica
      // dentro de core-service (apps/backend/services/core-service/src/guards/
      // brand-access.guard.ts) y valida acceso con una consulta LOCAL contra
      // su propia BD usando el userId del JWT (payload.sub) — sin llamada
      // HTTP, sin depender de este arreglo. Este campo se deja en el payload
      // solo por compatibilidad con JwtPayload; nada lo lee.
      brandIds: [] as string[],
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.repo.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.repo.revokeAllTokens(userId);
    return { message: 'Sesión cerrada' };
  }
}
