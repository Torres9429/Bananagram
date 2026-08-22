import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { AuthModule } from '../services/auth-service/src/auth/auth.module';
import { AuthService } from '../services/auth-service/src/auth/auth.service';
import { prisma as authPrisma } from '../services/auth-service/src/prisma/client';
import { cleanDatabase } from './helpers/db.helper';

// Integración real contra Postgres — cubre el account-linking de la Alexa
// Skill (LinkCode, no OAuth2): un código corto, de un solo uso, que el
// Lambda canjea por un accessToken/refreshToken reales del usuario.
describe('Account Link Code (Alexa Skill) Integration', () => {
  let authService: AuthService;
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase();
    await authPrisma.role.upsert({ where: { name: 'cliente' }, update: {}, create: { name: 'cliente' } });

    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    // .compile() NO dispara onModuleInit() — TokenSignerService carga las
    // llaves RS256 ahí, sin .init() nunca se leen (ver auth.integration.spec.ts).
    await moduleRef.init();
    authService = moduleRef.get(AuthService);

    const email = `link-code-test-${randomUUID()}@example.com`;
    await authService.register({ email, password: 'ChangeMe123!', name: 'Usuario LinkCode', roleName: 'cliente' });
    const user = await authPrisma.user.findFirstOrThrow({ where: { email } });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await authPrisma.$disconnect();
  });

  it('genera un código de 4 dígitos con expiración futura', async () => {
    const linkCode = await authService.createLinkCode(userId);
    expect(linkCode.code).toHaveLength(4);
    expect(linkCode.code).toMatch(/^\d{4}$/);
    expect(linkCode.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('canjea el código y devuelve tokens + userId/name para ese usuario', async () => {
    const linkCode = await authService.createLinkCode(userId);
    const session = await authService.redeemLinkCode({ code: linkCode.code });
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.refreshToken.token).toEqual(expect.any(String));
    expect(session.userId).toBe(userId);
    // core-service no está levantado en este módulo de test aislado — el
    // fallback a email (best-effort) es justo lo que se espera acá.
    expect(session.name).toEqual(expect.any(String));
  });

  it('rechaza reusar el mismo código una segunda vez', async () => {
    const linkCode = await authService.createLinkCode(userId);
    await authService.redeemLinkCode({ code: linkCode.code });

    await expect(authService.redeemLinkCode({ code: linkCode.code })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza un código inexistente', async () => {
    await expect(authService.redeemLinkCode({ code: 'NOEXISTE' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalida el código anterior al generar uno nuevo para el mismo usuario', async () => {
    const first = await authService.createLinkCode(userId);
    const second = await authService.createLinkCode(userId);
    expect(second.code).not.toBe(first.code);

    await expect(authService.redeemLinkCode({ code: first.code })).rejects.toBeInstanceOf(UnauthorizedException);

    const session = await authService.redeemLinkCode({ code: second.code });
    expect(session.accessToken).toEqual(expect.any(String));
  });
});
