import type { JwtPayload } from '../types/auth.types';

// Sin dependencias de @reduxjs/toolkit ni de nada React a propósito: este
// archivo lo importa también web-shell/middleware.ts (Next.js Edge
// Middleware) directamente vía el subpath @repo/ui/jwt — importar decodeJwt
// desde @repo/ui/state arrastraría auth.api.ts/catalogs.api.ts
// (@reduxjs/toolkit/query/react) al bundle de Edge, que no soporta esas
// dependencias y rompía el middleware en runtime (rutas devolviendo 404).

// Codifica un payload en base64 seguro para JWT, preservando caracteres no
// ASCII (nombres con tildes: "Ana García", "Roberto Fernández", "Laura
// Méndez") — btoa() por sí solo trata el string como Latin-1 y no coincide
// con el esquema de bytes UTF-8 que decodeJwt() espera al decodificar, lo
// que hacía fallar el login silenciosamente (decodeJwt devolvía null) para
// cualquier usuario con un carácter acentuado en el payload. TextEncoder da
// los bytes UTF-8 reales; btoa() solo empaqueta esos bytes en base64.
function toBinaryString(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

export function encodeMockJwt(payload: object): string {
  const header = btoa(toBinaryString(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = btoa(toBinaryString(JSON.stringify(payload)));
  return `${header}.${body}.mock-signature`;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
