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

    const permissions = await this.repo.getPermissions(user.roleId);
    const brandIds = user.brandUsers.map((bu: any) => bu.brandId);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      brandIds,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.repo.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(token: string) {
    const rt = await this.repo.findRefreshToken(token);
    if (!rt || rt.usedAt || rt.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    await this.repo.markTokenUsed(rt.id);
    // re-emitir con nuevos tokens
    return this.login({ email: rt.user.email, password: '' }); // TODO: refactor
  }

  async logout(userId: string) {
    await this.repo.revokeAllTokens(userId);
    return { message: 'Sesión cerrada' };
  }
}
