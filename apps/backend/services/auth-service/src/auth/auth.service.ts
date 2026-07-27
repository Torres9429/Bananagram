import { Injectable, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

// Rol que recibe quien se auto-registra: el flujo de alta espontánea de este
// sistema es "un Cliente pide que le gestionen sus redes", así que nace
// Cliente. CM/Diseñador se incorporan asignados por un Admin, no por
// auto-registro (evita que cualquiera se dé de alta como staff interno).
const DEFAULT_REGISTER_ROLE = process.env.DEFAULT_REGISTER_ROLE || 'cliente';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email ya registrado');

    const role = await this.repo.findRoleByName(DEFAULT_REGISTER_ROLE);
    if (!role) {
      throw new UnauthorizedException(`Rol por defecto '${DEFAULT_REGISTER_ROLE}' no existe — corre el seed`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.createUser(dto.email, passwordHash, role.id);

    // Best-effort: el nombre para mostrar vive en UserProfile, en la BD de
    // core-service (servicios separados, sin @relation real — ver
    // docs/base/modelo2.txt). No bloqueamos el registro si core-service está
    // caído: el login/JWT no depende de este dato, solo el nombre en UI.
    await this.createProfileBestEffort(user.id, dto.name);

    return this.issueTokens(user);
  }

  private async createProfileBestEffort(userId: string, name: string) {
    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    try {
      await fetch(`${coreServiceUrl}/api/internal/user-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name }),
      });
    } catch {
      // core-service caído: el perfil se puede crear/actualizar después
      // (el endpoint es un upsert), no vale la pena tumbar el registro por esto.
    }
  }

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
