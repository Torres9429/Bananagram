// Resuelve el título del TopBar por ruta exacta (no solo por el primer
// segmento del path) — necesario porque /profile y sus sub-rutas
// (/profile/calendar, /profile/campaigns/*) representan pantallas distintas
// dentro del mismo dominio de Perfil único. '*' matchea un segmento dinámico
// (ej. el [campaignId] de /profile/campaigns/[campaignId]).
interface TitleRoute {
  segments: string[];
  title: string;
}

const TITLE_ROUTES: TitleRoute[] = [
  { segments: ['profile'], title: 'Mi perfil' },
  { segments: ['profile', 'calendar'], title: 'Calendario' },
  { segments: ['profile', 'campaigns'], title: 'Campañas' },
  { segments: ['profile', 'campaigns', '*'], title: 'Detalle de campaña' },
  { segments: ['profile', 'campaigns', '*', 'posts'], title: 'Publicaciones de campaña' },
  { segments: ['profile', 'campaigns', '*', 'team'], title: 'Equipo de campaña' },
  { segments: ['my-campaigns'], title: 'Mis campañas' },
  { segments: ['team'], title: 'Equipo' },
  { segments: ['my-brand'], title: 'Mi perfil' },
  { segments: ['onboarding'], title: 'Mi perfil' },
  // Legacy /brands/[id]/* — misma estructura de campañas que /profile, solo
  // que navegada por id de marca en vez de por el perfil del usuario en sesión.
  { segments: ['brands'], title: 'Marcas' },
  { segments: ['brands', '*'], title: 'Detalle de marca' },
  { segments: ['brands', '*', 'metrics'], title: 'Métricas' },
  { segments: ['brands', '*', 'score'], title: 'Score' },
  { segments: ['brands', '*', 'reports'], title: 'Reportes' },
  { segments: ['brands', '*', 'calendar'], title: 'Calendario' },
  { segments: ['brands', '*', 'campaigns'], title: 'Campañas' },
  { segments: ['brands', '*', 'campaigns', '*'], title: 'Detalle de campaña' },
  { segments: ['brands', '*', 'campaigns', '*', 'posts'], title: 'Publicaciones de campaña' },
  { segments: ['brands', '*', 'campaigns', '*', 'team'], title: 'Equipo de campaña' },
];

// Rutas más largas (más segmentos) primero, para que una coincidencia
// específica (ej. .../campaigns/*/team) nunca sea opacada por una más
// genérica del mismo prefijo (ej. .../campaigns/*).
const SORTED_ROUTES = [...TITLE_ROUTES].sort((a, b) => b.segments.length - a.segments.length);

export function getTopBarTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);

  const match = SORTED_ROUTES.find(
    (route) =>
      route.segments.length === segments.length &&
      route.segments.every((seg, i) => seg === '*' || seg === segments[i]),
  );
  if (match) return match.title;

  // Fallback para rutas no listadas (ej. una sub-ruta futura todavía sin
  // título propio): mismo criterio simple usado antes de este resolver.
  return pathname.startsWith('/brands') ? 'Marcas' : 'Mi perfil';
}
