import type { MockUser } from '../types/auth.types';

function encodeMockJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
}

export function buildTokenFromUser(user: MockUser): string {
  return encodeMockJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl ?? null,
    ownedBrandIds: user.ownedBrandIds ?? [],
    permissions: user.permissions,
  });
}
