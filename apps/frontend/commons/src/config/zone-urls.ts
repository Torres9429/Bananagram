// Único lugar con la URL base del API Gateway — evita repetir este fallback
// en cada store/api/*.ts de cada app (y en commons/src/api/auth.api.ts).
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Único lugar con los puertos/URLs de cada microfront — evita repetir estas
// constantes en el Sidebar/TopBar/dashboards de cada app.
export const ZONE_URLS = {
  webShell: process.env.NEXT_PUBLIC_WEB_SHELL_URL || 'http://localhost:3000',
  adminFront: process.env.NEXT_PUBLIC_ADMIN_FRONT_URL || 'http://localhost:3010',
  analyticsFront: process.env.NEXT_PUBLIC_ANALYTICS_FRONT_URL || 'http://localhost:3011',
  authFront: process.env.NEXT_PUBLIC_AUTH_FRONT_URL || 'http://localhost:3012',
  brandsFront: process.env.NEXT_PUBLIC_BRANDS_FRONT_URL || 'http://localhost:3013',
  postsFront: process.env.NEXT_PUBLIC_POSTS_FRONT_URL || 'http://localhost:3014',
} as const;
