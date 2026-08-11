/**
 * Firma RS256 con la llave privada local; publica el JWKS con la pública.
 * Por qué asimétrico: core-service, alexa-service y el gateway verifican con
 * la pública y NUNCA pueden firmar. Con HS256 (el secreto compartido de
 * antes) cualquiera de ellos habría podido emitir tokens válidos también.
 * Por qué iss/aud: sin ellos, un token firmado por esta llave para otro
 * sistema (u otro entorno) también pasaría la verificación de firma aquí.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  calculateJwkThumbprint,
  exportJWK,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
  type JWTPayload,
  type KeyLike,
} from 'jose';

export type AccessTokenClaims = {
  sub: string;
  email: string;
  roles: string[];
  brandIds: string[];
  permissions: Record<string, string[]>;
};

@Injectable()
export class TokenSignerService implements OnModuleInit {
  private privateKey!: KeyLike;
  private publicKey!: KeyLike;
  private kid!: string;
  private publicJwk!: Record<string, unknown>;

  private readonly accessTtlSec = parseExpiresIn(process.env.JWT_EXPIRES_IN ?? '15m');
  private readonly issuer = process.env.JWT_ISSUER ?? 'bananagram-auth';
  private readonly audience = process.env.JWT_AUDIENCE ?? 'bananagram-api';

  async onModuleInit() {
    const privatePath = resolveKeyPath(process.env.JWT_PRIVATE_KEY_PATH, 'jwt_private.pem');
    const publicPath = resolveKeyPath(process.env.JWT_PUBLIC_KEY_PATH, 'jwt_public.pem');
    const privatePem = readFileSync(privatePath, 'utf8');
    const publicPem = readFileSync(publicPath, 'utf8');

    this.privateKey = await importPKCS8(privatePem, 'RS256');
    this.publicKey = await importSPKI(publicPem, 'RS256');

    const jwk = await exportJWK(this.publicKey);
    // kid = thumbprint RFC 7638 del JWK: estable ante cambios de formato del
    // PEM (un hash del archivo cambiaría con un salto de línea; el thumbprint no).
    this.kid = await calculateJwkThumbprint(jwk);
    this.publicJwk = { ...jwk, kid: this.kid, use: 'sig', alg: 'RS256' };
  }

  getJwks() {
    return { keys: [this.publicJwk] };
  }

  async signAccess(
    claims: AccessTokenClaims,
  ): Promise<{ accessToken: string; jti: string; expiresAt: Date }> {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + this.accessTtlSec * 1000);

    const accessToken = await new SignJWT({
      email: claims.email,
      roles: claims.roles,
      brandIds: claims.brandIds,
      permissions: claims.permissions,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setSubject(claims.sub)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSec}s`)
      .setJti(jti)
      .sign(this.privateKey);

    return { accessToken, jti, expiresAt };
  }

  async verifyAccess(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.publicKey, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return payload;
  }
}

// JWT_EXPIRES_IN acepta '15m'/'900s'/'1h' (mismo formato que antes usaba
// @nestjs/jwt). Se necesita como segundos numéricos tanto para
// setExpirationTime como para el TTL del denylist — parseo mínimo, sin traer
// una librería de duraciones solo para esto.
function parseExpiresIn(value: string): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(value.trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's') as 's' | 'm' | 'h' | 'd';
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return amount * multiplier;
}

// Las llaves viven siempre en <repo-root>/keys, pero cada proceso corre con un
// CWD distinto: turbo arranca auth-service con CWD=paquete, los tests corren
// desde apps/backend/test y pnpm dev desde la raíz. Si la ruta configurada
// (JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH) no existe desde el CWD actual,
// se sube de directorio hasta encontrar keys/<defaultName>. En Docker la ruta
// configurada sí existe (volumen montado en /repo/keys), así que no cambia nada.
function resolveKeyPath(configuredPath: string | undefined, defaultName: string): string {
  if (configuredPath) {
    const resolved = resolve(configuredPath);
    if (existsSync(resolved)) return resolved;
  }
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, 'keys', defaultName);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `No se encontró la llave ${defaultName}. Ejecuta 'pnpm generate-keys' (las crea en <repo-root>/keys) o revisa JWT_PRIVATE_KEY_PATH/JWT_PUBLIC_KEY_PATH.`,
  );
}
