import { Injectable, Logger, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const REGISTER_ROLE_MAP = {
  cliente: 'cliente',
  cm: 'community_manager',
  disenador: 'disenador',
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email ya registrado');

    const role = await this.repo.findRoleByName(REGISTER_ROLE_MAP[dto.roleName]);
    if (!role) {
      throw new UnauthorizedException(`Rol '${REGISTER_ROLE_MAP[dto.roleName]}' no existe — corre el seed`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.createUser(dto.email, passwordHash, role.id);

    // Best-effort: el nombre para mostrar vive en UserProfile, en la BD de
    // core-service (servicios separados, sin @relation real — ver
    // docs/base/modelo2.txt). No bloqueamos el registro si core-service está
    // caído: el login/JWT no depende de este dato, solo el nombre en UI.
    await this.createProfileBestEffort(user.id, dto);

    return this.issueTokens(user);
  }

  private async createProfileBestEffort(
    userId: string,
    dto: { name: string; avatarUrl?: string; roleName: string; categoryIds?: string[]; specialtyIds?: string[] },
  ) {
    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    try {
      const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...dto }),
      });

      if (!response.ok) {
        // fetch() no rechaza la promesa en 4xx/5xx — hay que revisar
        // response.ok a mano o un fallo de validación (ej. CM sin
        // categoryIds) queda invisible y el usuario se registra sin perfil.
        const payload = await response.json().catch(() => ({}));
        this.logger.error(
          `No se pudo crear el perfil en core-service (status ${response.status}): ${payload?.message ?? 'sin detalle'}`,
        );
      }
    } catch (error) {
      this.logger.error('Error al crear perfil en core-service (no bloquea registro):', error);
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
    const nextToken = uuidv4();
    const result = await this.repo.rotateRefreshToken(token, nextToken);

    if (result.status === 'not_found') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (result.status === 'reused') {
      // Reuso detectado (token ya consumido, revocado o expirado): se
      // revocó la familia entera en el repository. Ni siquiera avisamos
      // cuál fue la causa exacta — el mensaje es el mismo para no darle
      // pistas a quien esté reintentando un token robado.
      throw new UnauthorizedException(
        'Refresh token reusado o expirado: la sesión fue revocada, vuelve a iniciar sesión',
      );
    }
    return this.issueTokens(result.user, result.refreshToken);
  }

  // Compartido por login()/register() (crean sesión nueva) y refresh()
  // (recibe el refresh ya rotado por AuthRepository.rotateRefreshToken).
  // No hay verificación de contraseña aquí porque para cuando se llega a
  // este punto ya se validó identidad (password correcto en login/register,
  // o refresh token válido/sin usar en refresh).
  private async issueTokens(
    user: { id: string; email: string; roleId: string; role: { name: string } },
    existingRefreshToken?: { token: string },
  ) {
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
    const refreshToken = existingRefreshToken ?? (await this.repo.createRefreshToken(user.id));

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.repo.revokeAllTokens(userId);
    return { message: 'Sesión cerrada' };
  }

  // Respuesta uniforme sin importar si el email existe: no revela identidades.
  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) return { requested: true };

    const resetToken = await this.repo.createPasswordResetToken(user.id);
    // El token en claro solo se expone fuera de producción, para probarlo
    // localmente sin necesitar un envío de correo real (no implementado).
    return process.env.NODE_ENV === 'production'
      ? { requested: true }
      : { requested: true, devToken: resetToken.token };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const stored = await this.repo.findValidPasswordResetToken(dto.token);
    if (!stored) throw new UnauthorizedException('Token inválido o expirado');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.consumePasswordResetToken(stored.id, stored.userId, passwordHash);
    return { reset: true };
  }
}
