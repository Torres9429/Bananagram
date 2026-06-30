const STORAGE_KEY = 'mock_access_token';

interface JwtPayload {
  email?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getMockSessionEmail(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  return payload?.email?.trim() || null;
}
