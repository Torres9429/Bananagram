export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  brandIds: string[];
  permissions: Record<string, string[]>; // { 'publicaciones': ['crear','ver'] }
}
