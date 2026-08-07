export interface JwtPayload {
  sub: string;       // userId
  email: string;
  roles: string[];   // multi-rol: unión de permisos por roleId, ver auth-service/src/auth/auth.repository.ts
  brandIds: string[];
  permissions: Record<string, string[]>; // { 'publicaciones': ['crear','ver'] }
  jti: string;        // id único del token, usado por la denylist de logout
}
