import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL, ZONE_URLS } from '../config/zone-urls';
import {
  getCookieToken,
  setCookieToken,
  getRefreshCookieToken,
  setRefreshCookieToken,
  deleteCookieToken,
  deleteRefreshCookieToken,
} from '../session/cookieSession';
import { setCredentials, logout } from '../state/auth.slice';

// El refresh token es de un solo uso (rotación con detección de reuso, ver
// ADR-0004: reusar un token ya consumido revoca TODA la familia). Si 2+
// requests en la misma zona reciben 401 al mismo tiempo (ej. una página que
// dispara varias queries en paralelo), NO deben disparar su propio
// POST /auth/refresh cada uno — el segundo llegaría con el token que el
// primero ya consumió y el backend cerraría la sesión entera por "reuso".
// Este módulo vive en commons pero cada zona (puerto) tiene su propio bundle
// de JS, así que este singleton solo coordina dentro de una misma zona/pestaña
// — que es exactamente el alcance donde puede haber requests paralelos reales.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshCookieToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data: { accessToken: string; refreshToken: { token: string } } = await res.json();
    setCookieToken(data.accessToken);
    setRefreshCookieToken(data.refreshToken.token);
    return data.accessToken;
  } catch {
    return null;
  }
}

function clearSessionAndRedirectToLogin(): void {
  deleteCookieToken();
  deleteRefreshCookieToken();
  if (typeof window !== 'undefined') {
    window.location.href = `${ZONE_URLS.authFront}/login`;
  }
}

/**
 * baseQuery para usar en createApi() de cualquier zona — igual que
 * fetchBaseQuery + Authorization: Bearer, pero si una request da 401
 * (access token expirado, vida útil de 15 min) intenta renovarlo una sola
 * vez vía /auth/refresh y reintenta la request original. Si el refresh
 * también falla (refresh token expirado/revocado/reusado), cierra la sesión
 * y manda a login — ya no hay nada que reintentar.
 */
export function createAuthenticatedBaseQuery(): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getCookieToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        api.dispatch(setCredentials({ accessToken: newAccessToken }));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
        clearSessionAndRedirectToLogin();
      }
    }

    return result;
  };
}
