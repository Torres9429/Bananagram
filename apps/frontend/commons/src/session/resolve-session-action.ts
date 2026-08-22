import { decodeJwt } from '../state/jwt';
import { API_BASE_URL } from '../config/zone-urls';

// Sin dependencias de next/server a propósito: esta función la llaman los 5
// middleware.ts (uno por zona, Next.js exige el archivo en la raíz de cada
// app — no se puede compartir el archivo en sí) pero toda la lógica de
// decisión vive UNA sola vez acá. Cada middleware.ts es un wrapper delgado
// que solo traduce cookies de NextRequest <-> este contrato de strings
// planos y arma la NextResponse (next/set-cookie/redirect).
export type SessionAction =
  | { type: 'allow' }
  | { type: 'refresh'; accessToken: string; refreshToken: string }
  | { type: 'redirect' };

export async function resolveSessionAction(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<SessionAction> {
  const payload = accessToken ? decodeJwt(accessToken) : null;
  const isExpired = !payload?.exp || payload.exp * 1000 < Date.now();

  if (payload && !isExpired) {
    return { type: 'allow' };
  }

  if (refreshToken) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const data: { accessToken: string; refreshToken: { token: string } } = await res.json();
        return { type: 'refresh', accessToken: data.accessToken, refreshToken: data.refreshToken.token };
      }
    } catch {
      // sigue a 'redirect' abajo
    }
  }

  // Sin token, o expirado y sin refresh token, o el refresh también falló
  // (vencido/revocado/reusado) — no hay nada más que intentar.
  return { type: 'redirect' };
}
