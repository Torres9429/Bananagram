import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthModule } from '../services/auth-service/src/auth/auth.module';
import { AuthService } from '../services/auth-service/src/auth/auth.service';
import { prisma as authPrisma } from '../services/auth-service/src/prisma/client';
import { cleanDatabase } from './helpers/db.helper';

// Integración real contra Postgres (docker compose up -d postgres) — sin
// mocks de Prisma: valida el flujo completo login/refresh/reuso contra la
// BD real de auth-service.
describe('Auth Integration', () => {
  let authService: AuthService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    await cleanDatabase();
    await authPrisma.role.upsert({
      where: { name: 'cliente' },
      update: {},
      create: { name: 'cliente' },
    });

    moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    // init() dispara onModuleInit de TokenSignerService (carga las llaves RS256);
    // sin esto privateKey queda undefined y signAccess falla con "Key ... Received undefined".
    await moduleRef.init();
    authService = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    await cleanDatabase();
    await authPrisma.$disconnect();
    // close() dispara onModuleDestroy de TokenDenylistService (desconecta
    // Redis); sin esto ioredis mantiene el event loop vivo y jest no termina.
    await moduleRef.close();
  });

  it('should register and login returning a JWT', async () => {
    const registered = await authService.register({
      email: 'auth-test@example.com',
      password: 'ChangeMe123!',
      name: 'Test User',
      roleName: 'cliente',
    });
    expect(registered.accessToken).toEqual(expect.any(String));
    expect(registered.refreshToken.token).toEqual(expect.any(String));

    const logged = await authService.login({ email: 'auth-test@example.com', password: 'ChangeMe123!' });
    expect(logged.accessToken).toEqual(expect.any(String));
  });

  it('should return 401 on invalid credentials', async () => {
    await expect(
      authService.login({ email: 'auth-test@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      authService.login({ email: 'no-such-user@example.com', password: 'whatever123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should rotate the refresh token and revoke the whole family on reuse', async () => {
    const session = await authService.login({ email: 'auth-test@example.com', password: 'ChangeMe123!' });
    const originalToken = session.refreshToken.token;

    const rotated = await authService.refresh(originalToken);
    expect(rotated.refreshToken.token).not.toEqual(originalToken);

    // Reusar el token viejo (ya consumido) debe fallar...
    await expect(authService.refresh(originalToken)).rejects.toBeInstanceOf(UnauthorizedException);

    // ...y revocar también al token nuevo que había ganado la rotación,
    // aunque nunca se haya usado él mismo (detección de reuso, ver
    // AuthRepository.rotateRefreshToken).
    await expect(authService.refresh(rotated.refreshToken.token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
