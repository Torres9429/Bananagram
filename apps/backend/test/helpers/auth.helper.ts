import * as jwt from 'jsonwebtoken';
export function generateTestToken(role: string, brandIds: string[] = [], permissions: Record<string, string[]> = {}) {
  return jwt.sign(
    { sub: 'test-user-id', email: 'test@test.com', role, brandIds, permissions },
    process.env.JWT_SECRET || 'supersecret',
    { expiresIn: '1h' },
  );
}
