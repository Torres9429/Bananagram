// Capa de persistencia de sesión compartida entre todos los microfrontends.
//
// Por qué cookies y no localStorage:
//   localStorage es por ORIGEN (scheme + host + puerto). Cada microfront
//   en un puerto distinto tiene su propio localStorage aislado.
//   Las cookies son por HOST (scheme + host, sin puerto). Una cookie
//   establecida en localhost:3012 está disponible en localhost:3000,
//   localhost:3010, localhost:3013, etc.
//
// Cuando se conecte el backend real:
//   Reemplazar setCookieToken por la cookie HttpOnly que el backend entrega
//   en el header Set-Cookie de la respuesta de login. El resto del sistema
//   (useSessionBootstrap, Redux) no cambia.

const COOKIE_NAME = 'bananagram_token';

export function getCookieToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.trim().slice(COOKIE_NAME.length + 1)) : null;
}

export function setCookieToken(token: string): void {
  if (typeof window === 'undefined') return;
  // SameSite=Lax: se envía en navegaciones de nivel superior (window.location.href)
  // sin necesidad de un dominio explícito — funciona para todos los puertos de localhost.
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

export function deleteCookieToken(): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; SameSite=Lax; Max-Age=0`;
}
