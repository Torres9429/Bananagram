import type { Media } from '@repo/ui/types';
import {
  MOCK_SOCIAL_ACCOUNTS,
  MOCK_CAMPAIGNS,
  MOCK_BRANDS,
  AVAILABLE_SOCIAL_NETWORKS,
  getSocialAccount,
  getBrand,
  getSocialAccountsForCampaign,
} from '@repo/ui';
import type {
  MockPost,
  StatusHistoryItem,
  SocialNetworkCode,
} from '../interfaces/interface';

// Reexportados sin cambios — mock-data.ts sigue siendo el único punto de
// import de "datos mock" para las páginas de posts-front, pero la fuente de
// verdad de marcas/cuentas/campañas ahora vive en @repo/ui/mocks/mock-world
// (compartida con brands-front, ver docs/frontend-db-alignment-implementation.md
// §7). Antes cada app tenía su propia copia con IDs parecidos pero shapes y
// valores distintos (ej. followers de Zara Instagram: 1.2M vs 128k según el
// app) — ya no.
export { MOCK_SOCIAL_ACCOUNTS, MOCK_CAMPAIGNS, MOCK_BRANDS, AVAILABLE_SOCIAL_NETWORKS, getSocialAccount, getBrand, getSocialAccountsForCampaign };

// Nombres completos en minúsculas — alineados a SocialNetwork.code en
// modelo.txt (antes códigos cortos en mayúsculas 'IG'/'TK'/'LI'/'FB'/'X'/'YT',
// ver docs/frontend-db-alignment.md §1.5/§9.2).
export const NETWORK_LABELS: Record<SocialNetworkCode, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  x: 'X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

// Abreviatura solo para el avatar circular (NetworkAvatar) — mostrar el
// nombre completo ('instagram') dentro de un círculo de 32-48px no cabe.
export const NETWORK_SHORT_LABELS: Record<SocialNetworkCode, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  facebook: 'FB',
  x: 'X',
  linkedin: 'LI',
  youtube: 'YT',
};

// Colores del avatar circular por RED (no por cuenta) — puramente visuales,
// no viven en el SocialAccount compartido (@repo/ui/types/social-network.types)
// a propósito: así todas las cuentas de Instagram se ven igual sin importar
// de qué marca sean, en vez de repetir la misma pareja de colores en cada
// SocialAccount como se hacía antes.
export const NETWORK_DISPLAY_COLORS: Record<SocialNetworkCode, { bg: string; color: string }> = {
  instagram: { bg: '#FCE4EC', color: '#880E4F' },
  linkedin: { bg: '#E3F2FD', color: '#0D47A1' },
  facebook: { bg: '#FFF3E0', color: '#E65100' },
  tiktok: { bg: '#E8EAF6', color: '#283593' },
  x: { bg: '#ECEFF1', color: '#263238' },
  youtube: { bg: '#FFEBEE', color: '#B71C1C' },
};

// Helper de conveniencia: deriva todo lo que las vistas necesitan mostrar
// (red, colores del avatar, nombre de marca) a partir de UNA SocialAccount
// específica. Antes operaba sobre post.brandProfileId (único); ahora un Post
// puede tener N PostSocialAccount, así que recibe el socialAccountId como
// parámetro — cada call-site decide cuál de las cuentas del post mostrar
// (típicamente la primera, para las vistas agregadas de lista/kanban — ver
// docs/frontend-db-alignment.md §1.1 y decisión §9.3/§3).
export function getPostNetworkInfo(socialAccountId: string | undefined) {
  const account = socialAccountId ? getSocialAccount(socialAccountId) : undefined;
  // socialNetworkId YA es el código de red directo en el mundo mock
  // compartido (ej. 'instagram'), no un id de catálogo intermedio como el
  // SOCIAL_NETWORK_CATALOG local que existía antes.
  const code = account?.socialNetworkId as SocialNetworkCode | undefined;
  const colors = code ? NETWORK_DISPLAY_COLORS[code] : undefined;
  return {
    network: code ?? '—', // code crudo (ej. 'instagram'), útil para lookups
    networkLabel: code ? NETWORK_LABELS[code] : '—', // nombre completo, para texto
    networkShort: code ? NETWORK_SHORT_LABELS[code] : '—', // abreviatura, para el avatar
    networkBg: colors?.bg ?? '#EEEEEE',
    networkColor: colors?.color ?? '#666666',
    brand: (account ? getBrand(account.brandId)?.name : undefined) ?? '—',
  };
}

export const MOCK_POSTS: MockPost[] = [
  {
    id: 'p1',
    title: 'Post lanzamiento verano',
    brandId: 'b1',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#E0A800' },
    designer: 'Rocío Rodríguez',
    status: 'borrador',
    createdAt: 'Hace 2 h',
    content:
      '✨ El verano llegó con todo. Descubre nuestra colección SS25 — piezas pensadas para vivir el calor con estilo. #ZaraSS25 #Verano2025 #Moda',
    hashtags: ['#ZaraSS25', '#Verano2025', '#Moda'],
    scheduledAt: null,
    ayrsharePostId: null,
    socialAccounts: [
      { id: 'psa1', socialAccountId: 'bp1', status: 'pendiente' },
    ],
    media: [
      { mediaId: 'md1', order: 0 },
      { mediaId: 'md2', order: 1 },
    ],
  },
  {
    id: 'p2',
    title: 'Reel Nike 30 seg',
    brandId: 'b2',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    designer: 'Alexa Delgado',
    status: 'rechazado',
    createdAt: 'Hace 28 min',
    content:
      '🏃 Corre más rápido. Vive más fuerte. El nuevo Nike Air Max 2025 ya está aquí. #NikeRun #Running #AirMax2025',
    hashtags: ['#NikeRun', '#Running', '#AirMax2025'],
    scheduledAt: null,
    ayrsharePostId: null,
    socialAccounts: [
      { id: 'psa2', socialAccountId: 'bp4', status: 'pendiente' },
    ],
    rejectionReason: 'Falta una CTA clara. El reel debe terminar con un texto de acción visible.',
  },
  {
    id: 'p3',
    title: 'Carrusel colores SS25',
    brandId: 'b1',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#E0A800' },
    designer: 'Elías Bailón',
    status: 'en_revision',
    createdAt: 'Hace 5 h',
    content: 'Los colores de esta temporada, uno a uno. ¿Cuál es el tuyo? 🎨 #ZaraColors #SS25',
    hashtags: ['#ZaraColors', '#SS25'],
    scheduledAt: null,
    ayrsharePostId: null,
    socialAccounts: [
      { id: 'psa3', socialAccountId: 'bp2', status: 'pendiente' },
    ],
  },
  {
    id: 'p4',
    title: 'Story promo weekend',
    brandId: 'b1',
    campaign: null,
    designer: 'Rocío Rodríguez',
    status: 'programado',
    createdAt: 'Hoy 18:00',
    content: 'Este fin de semana, descuentos en toda la colección primavera.',
    hashtags: ['#ZaraMéxico'],
    scheduledAt: 'Hoy 18:00',
    ayrsharePostId: null,
    socialAccounts: [
      { id: 'psa4', socialAccountId: 'bp3', status: 'pendiente' },
    ],
  },
  {
    id: 'p5',
    title: 'Reels sustentabilidad',
    brandId: 'b2',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    designer: 'Alexa Delgado',
    // Multi-red con resultado mixto: Instagram publicado, TikTok con error →
    // ejemplo vivo del estado `parcial` (ver docs/frontend-db-alignment.md §1.1).
    status: 'parcial',
    createdAt: 'Ayer 12:00',
    content: '🌿 Moda que cuida el planeta. Colección eco-friendly SS25.',
    hashtags: ['#Nike', '#Sustentabilidad'],
    scheduledAt: 'Ayer 12:00',
    ayrsharePostId: 'ay_8823f1',
    socialAccounts: [
      {
        id: 'psa5a',
        socialAccountId: 'bp5',
        status: 'publicado',
        socialPostId: 'sp_ig_5521',
        postUrl: 'https://instagram.com/p/nike-eco-1',
        publishedAt: 'Ayer 12:00',
        metrics: [
          {
            id: 'm1',
            postSocialAccountId: 'psa5a',
            likes: 1240,
            comments: 87,
            shares: 34,
            views: 18500,
            reach: 24000,
            engagement: 5.4,
            capturedAt: 'Ayer 18:00',
          },
        ],
      },
      {
        id: 'psa5b',
        socialAccountId: 'bp4',
        status: 'error',
        errorMessage: 'Ayrshare: token de TikTok expirado, reautoriza la cuenta.',
      },
    ],
    media: [{ mediaId: 'md4', order: 0 }],
  },
];

export const MOCK_STATUS_HISTORY: Record<string, StatusHistoryItem[]> = {
  p2: [
    {
      status: 'rechazado',
      label: 'Rechazado',
      color: '#C62828',
      actor: 'Rocío Rodríguez',
      role: 'Cliente',
      date: '25 jun, 16:45',
      comment: 'Falta una CTA clara. El reel debe terminar con un texto de acción visible.',
    },
    {
      status: 'en_revision',
      label: 'Enviado a revisión',
      color: '#1565C0',
      actor: 'Ana García',
      role: 'CM',
      date: '25 jun, 14:30',
      comment: null,
    },
    {
      status: 'borrador',
      label: 'Borrador creado',
      color: '#8F8F8F',
      actor: 'Alexa Delgado',
      role: 'Diseñador',
      date: '25 jun, 10:00',
      comment: null,
    },
  ],
};

// Agrega una entrada al historial de una publicación — mismo patrón que
// assignTeamToCampaign en brands-front (mutación directa del mock compartido,
// sin backend real). Se usa desde /posts/[id] y /posts/approvals para que el
// motivo de rechazo quede visible sin importar desde dónde se rechazó.
export function addStatusHistoryEntry(postId: string, entry: StatusHistoryItem) {
  MOCK_STATUS_HISTORY[postId] = [entry, ...(MOCK_STATUS_HISTORY[postId] ?? [])];
}

// Límite de caracteres único para todas las redes (decisión de producto §9.9
// en docs/frontend-db-alignment.md: NO se calcula el mínimo entre las redes
// seleccionadas ni límites distintos por red — un solo valor, siempre igual).
// 2200 = límite de caption de Instagram, la red más restrictiva de uso común
// entre el catálogo mock (frente a los ~3000-63000 de LinkedIn/Facebook y muy
// por encima de los 280 de X, que hoy no se modela como límite real de UX).
export const POST_CHAR_LIMIT = 2200;

// Panel IA mock (§ crear publicación) — sugerencias y horarios simulados,
// sin backend real todavía.
export const MOCK_AI_SUGGESTIONS = [
  'Agrega una llamada a la acción clara al final del copy.',
  'Reduce a 3-5 hashtags. Más de 7 reduce el alcance orgánico.',
  'Mejor horario para tu audiencia: 18:00–20:00.',
];

export const MOCK_TIME_SLOTS = ['Hoy 18:00', 'Mañana 12:00', 'Jue 09:00'];

// ── Biblioteca de medios (Media/PostMedia, ver modelo.txt) ─────────────────
// Primera representación en el frontend de esta relación — antes ni un campo
// vacío (ver docs/frontend-db-alignment-implementation.md §7). Local a
// posts-front (no vive en mock-world.ts): brands-front no necesita listar
// archivos individuales, solo posts-front los adjunta a publicaciones.
// urls con picsum.photos (servicio público de placeholders, cargan de verdad
// en un <img>) — el "video" reutiliza el mismo tipo de URL solo para que el
// dato tenga forma correcta, no es reproducible.
export const MOCK_MEDIA_LIBRARY: Media[] = [
  { id: 'md1', brandId: 'b1', uploadedBy: 'user-disenador-001', fileName: 'zara-verano-hero.jpg', originalName: 'zara-verano-hero.jpg', mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/zara-verano-hero/800/600', size: 245000, width: 800, height: 600 },
  { id: 'md2', brandId: 'b1', uploadedBy: 'user-disenador-001', fileName: 'zara-colores-ss25.jpg', originalName: 'zara-colores-ss25.jpg', mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/zara-colores-ss25/800/600', size: 312000, width: 800, height: 600 },
  { id: 'md3', brandId: 'b2', uploadedBy: 'user-cm-001', fileName: 'nike-air-max-hero.jpg', originalName: 'nike-air-max-hero.jpg', mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/nike-air-max-hero/800/600', size: 289000, width: 800, height: 600 },
  { id: 'md4', brandId: 'b2', uploadedBy: 'user-cm-001', fileName: 'nike-run-reel.mp4', originalName: 'nike-run-reel.mp4', mimeType: 'video/mp4', url: 'https://picsum.photos/seed/nike-run-reel/800/600', size: 5200000, width: 1080, height: 1920, duration: 28 },
  { id: 'md5', brandId: 'b3', uploadedBy: 'user-cm-001', fileName: 'spotify-playlist-cover.jpg', originalName: 'spotify-playlist-cover.jpg', mimeType: 'image/jpeg', url: 'https://picsum.photos/seed/spotify-playlist-cover/800/600', size: 198000, width: 800, height: 600 },
  { id: 'md6', brandId: 'b4', uploadedBy: 'user-cliente-002', fileName: 'alex-reel-diario.mp4', originalName: 'alex-reel-diario.mp4', mimeType: 'video/mp4', url: 'https://picsum.photos/seed/alex-reel-diario/800/600', size: 4100000, width: 1080, height: 1920, duration: 15 },
];

export function getMedia(id: string): Media | undefined {
  return MOCK_MEDIA_LIBRARY.find((m) => m.id === id);
}

export function getMediaLibraryByBrand(brandId: string): Media[] {
  return MOCK_MEDIA_LIBRARY.filter((m) => m.brandId === brandId);
}
