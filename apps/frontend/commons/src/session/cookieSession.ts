// Capa de persistencia de sesión compartida entre todos los microfrontends.
//
// Por qué cookies y no localStorage:
//   localStorage es por ORIGEN (scheme + host + puerto). Cada microfront
//   en un puerto distinto tiene su propio localStorage aislado.
//   Las cookies son por HOST (scheme + host, sin puerto). Una cookie
//   establecida en localhost:3012 está disponible en localhost:3000,
//   localhost:3010, localhost:3013, etc.
//
// Bearer puro (ver auth.api.ts / authenticated-base-query.ts): estas cookies
// son solo el contenedor de storage cross-zona del token, no cookies de
// sesión que el navegador adjunte solo — cada request manda el
// Authorization: Bearer explícito.

const COOKIE_NAME = 'bananagram_token';
const REFRESH_COOKIE_NAME = 'bananagram_refresh_token';

function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .find((c) => c.trim().startsWith(`${name}=`));
  return match ? decodeURIComponent(match.trim().slice(name.length + 1)) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof window === 'undefined') return;
  // SameSite=Lax: se envía en navegaciones de nivel superior (window.location.href)
  // sin necesidad de un dominio explícito — funciona para todos los puertos de localhost.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; path=/; SameSite=Lax; Max-Age=0`;
}

export function getCookieToken(): string | null {
  return getCookie(COOKIE_NAME);
}

export function setCookieToken(token: string): void {
  setCookie(COOKIE_NAME, token);
}

export function deleteCookieToken(): void {
  deleteCookie(COOKIE_NAME);
}

// Refresh token real (login.refreshToken.token) — necesario para que
// authenticated-base-query.ts pueda renovar el access token (15 min de vida)
// sin forzar un nuevo login cada vez que expira.
export function getRefreshCookieToken(): string | null {
  return getCookie(REFRESH_COOKIE_NAME);
}

export function setRefreshCookieToken(token: string): void {
  setCookie(REFRESH_COOKIE_NAME, token);
}

export function deleteRefreshCookieToken(): void {
  deleteCookie(REFRESH_COOKIE_NAME);
}
