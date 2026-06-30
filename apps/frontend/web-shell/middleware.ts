import { NextResponse } from 'next/server';

// Diseño sin backend: el login real todavía no setea la cookie `access_token`
// (ver comentario "Consumo de API (pendiente)" en LoginForm.tsx), así que este guard
// se deja como passthrough para poder navegar libremente entre pantallas.
// Restaurar la redirección por cookie cuando el login quede conectado al backend.
export function middleware() {
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|public).*)'] };
