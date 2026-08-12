import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { TokenSignerService } from './token-signer.service';
import { TokenDenylistService } from './token-denylist.service';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { RedeemLinkCodeDto } from './dto/redeem-link-code.dto';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

const REGISTER_ROLE_MAP = {
  cliente: 'cliente',
  cm: 'community_manager',
  disenador: 'disenador',
} as const;

type UserWithRoles = {
  id: string;
  email: string;
  roles: { role: { id: string; name: string } }[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenSignerService,
    private readonly denylist: TokenDenylistService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email ya registrado');

    const role = await this.repo.findRoleByName(REGISTER_ROLE_MAP[dto.roleName]);
    if (!role) {
      throw new UnauthorizedException(`Rol '${REGISTER_ROLE_MAP[dto.roleName]}' no existe — corre el seed`);
    }

    const passwordHash = await argon2.hash(dto.password);
    // El auto-registro público siempre nace con un solo rol — roles
    // adicionales se agregan después vía POST /admin/users/:id/roles.
    const user = await this.repo.createUser(dto.email, passwordHash, [role.id]);

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
    const { roleName, ...rest } = dto;
    try {
      const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // roleNames en plural: core-service ya soporta multi-rol vía
        // UserProfile.roleNames (String[]) — el registro público solo manda
        // el único rol con el que nace el usuario.
        body: JSON.stringify({ userId, roleNames: [roleName], ...rest }),
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

    const valid = await argon2.verify(user.passwordHash, dto.password);
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
  private async issueTokens(user: UserWithRoles, existingRefreshToken?: { token: string }) {
    const roleIds = user.roles.map((r) => r.role.id);
    const roleNames = user.roles.map((r) => r.role.name);
    const permissions = await this.repo.getPermissions(roleIds);

    const { accessToken } = await this.tokens.signAccess({
      sub: user.id,
      email: user.email,
      roles: roleNames,
      // Bajo el modelo separado (docs/base/modelo2.txt) Brand/Campaign viven
      // en la base de core-service — auth-service ya no puede resolver
      // brandIds con un join local, y ya NO se intenta: queda siempre vacío
      // a propósito. BrandAccessGuard vive y se aplica dentro de
      // core-service y valida acceso con una consulta LOCAL contra su
      // propia BD usando el userId del JWT (payload.sub) — sin llamada
      // HTTP, sin depender de este arreglo. Se deja solo por compatibilidad
      // con JwtPayload; nada lo lee.
      brandIds: [],
      permissions,
    });
    const refreshToken = existingRefreshToken ?? (await this.repo.createRefreshToken(user.id));

    return { accessToken, refreshToken };
  }

  // jti/exp vienen del propio JWT ya verificado por JwtAuthGuard (el logout
  // de Bananagram se queda protegido, a diferencia de ControlAcceso donde es
  // público) — no hace falta re-verificar el token crudo aquí, el guard ya
  // lo hizo antes de llegar a este punto.
  async logout(userId: string, jti?: string, exp?: number) {
    if (jti && exp) {
      await this.denylist.revoke(jti, new Date(exp * 1000));
    }
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

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.repo.consumePasswordResetToken(stored.id, stored.userId, passwordHash);
    return { reset: true };
  }

  // Account-linking de la Alexa Skill — LinkCode, no OAuth2 (contrato ya
  // usado por el equipo externo del Lambda). El usuario logueado genera el
  // código desde el frontend; el Lambda lo canjea una sola vez.
  async createLinkCode(userId: string) {
    const linkCode = await this.repo.createAccountLinkCode(userId);
    return { code: linkCode.code, expiresAt: linkCode.expiresAt };
  }

  // Sin password: para cuando se llega aquí ya se validó identidad al
  // generar el código (el usuario estaba logueado) — mismo criterio que
  // refresh()/register() en issueTokens().
  async redeemLinkCode(dto: RedeemLinkCodeDto) {
    const stored = await this.repo.findValidAccountLinkCode(dto.code);
    if (!stored) throw new UnauthorizedException('Código inválido o expirado');

    await this.repo.consumeAccountLinkCode(stored.id);

    const user = await this.repo.findById(stored.userId);
    if (!user) throw new UnauthorizedException('El usuario asociado a este código ya no existe');

    const tokens = await this.issueTokens(user);
    const name = await this.fetchDisplayName(user.id, user.email);

    // userId/name además de los tokens (no en vez de): la skill los necesita
    // para saludar por nombre, pero sigue necesitando accessToken/
    // refreshToken reales para llamar al resto de endpoints de alexa-service
    // (todos exigen JWT, igual que cualquier otro cliente).
    return { ...tokens, userId: user.id, name };
  }

  // El nombre para mostrar vive en UserProfile (core-service), no en User
  // (auth-service) — ver "Modelo de datos vigente" en CLAUDE.md. Best-effort,
  // mismo criterio que createProfileBestEffort: si core-service está caído o
  // el perfil no existe todavía, no se rompe el canje, solo se usa el email.
  private async fetchDisplayName(userId: string, fallbackEmail: string): Promise<string> {
    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    try {
      const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles/${userId}`);
      if (!response.ok) return fallbackEmail;
      const profile = (await response.json()) as { name?: string } | null;
      return profile?.name ?? fallbackEmail;
    } catch {
      return fallbackEmail;
    }
  }
}
