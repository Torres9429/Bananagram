import type { MockUser } from '../types/auth.types';
import { encodeMockJwt } from '../state/auth.slice';

export function buildTokenFromUser(user: MockUser): string {
  return encodeMockJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: [user.role],
    status: user.status,
    avatarUrl: user.avatarUrl ?? null,
    ownedBrandIds: user.ownedBrandIds ?? [],
    permissions: user.permissions,
  });
}
