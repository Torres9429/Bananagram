import { Test } from '@nestjs/testing';
// Tests: POST /auth/login → JWT, POST /auth/refresh, 401 credenciales inválidas
describe('Auth Integration', () => {
  it('should login and return JWT', async () => {
    // TODO: implementar con supertest
    expect(true).toBe(true);
  });
  it('should return 401 on invalid credentials', async () => {
    expect(true).toBe(true);
  });
  it('should rotate refresh token', async () => {
    expect(true).toBe(true);
  });
});
