import type { MockUser } from './mock-users';

function encodeMockJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.mock-signature`;
}

export function buildTokenFromUser(user: MockUser): string {
  return encodeMockJwt({
    sub: user.email,
    email: user.email,
    role: user.role,
    brandIds: user.brandIds,
    permissions: user.permissions,
  });
}
