import type { SocialAccount, MockCampaign, MockPost, StatusHistoryItem, SocialNetworkCode } from '../interfaces/interface';

export const NETWORK_LABELS: Record<SocialNetworkCode, string> = {
  IG: 'Instagram', TK: 'TikTok', LI: 'LinkedIn', FB: 'Facebook', X: 'X', YT: 'YouTube',
};

export const MOCK_SOCIAL_ACCOUNTS: SocialAccount[] = [
  { id: 'bp1', brandName: 'Zara MX', socialNetwork: 'IG', handle: '@zaramx', networkBg: '#FCE4EC', networkColor: '#880E4F' },
  { id: 'bp2', brandName: 'Zara MX', socialNetwork: 'LI', handle: 'Zara México', networkBg: '#E3F2FD', networkColor: '#0D47A1' },
  { id: 'bp3', brandName: 'Zara MX', socialNetwork: 'FB', handle: 'Zara México', networkBg: '#FFF3E0', networkColor: '#E65100' },
  { id: 'bp4', brandName: 'Nike MX', socialNetwork: 'TK', handle: '@nikemx', networkBg: '#E8EAF6', networkColor: '#283593' },
  { id: 'bp5', brandName: 'Nike MX', socialNetwork: 'IG', handle: '@nikemexico', networkBg: '#FCE4EC', networkColor: '#880E4F' },
];

export function getSocialAccount(id: string): SocialAccount | undefined {
  return MOCK_SOCIAL_ACCOUNTS.find((p) => p.id === id);
}

// Helper de conveniencia: deriva todo lo que las vistas necesitan mostrar
// (red, colores del avatar, nombre de marca) a partir de la SocialAccount.
export function getPostNetworkInfo(post: Pick<MockPost, 'brandProfileId'>) {
  const profile = getSocialAccount(post.brandProfileId);
  return {
    network: profile?.socialNetwork ?? '—',
    networkBg: profile?.networkBg ?? '#EEEEEE',
    networkColor: profile?.networkColor ?? '#666666',
    brand: profile?.brandName ?? '—',
  };
}

export const MOCK_USER = {
  id: 'u1',
  name: 'Ana García',
  initials: 'AG',
  role: 'cm',
  avatarBg: '#E8F5E9',
  avatarColor: '#2E7D32',
};

export const MOCK_CAMPAIGNS: MockCampaign[] = [
  { id: 'c1', name: 'Campaña Verano', color: '#E0A800', brand: 'Zara MX' },
  { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5', brand: 'Nike MX' },
  { id: 'c3', name: 'Spotify Weekly', color: '#66BB6A', brand: 'Spotify MX' },
];

// SocialAccounts disponibles por campaña (para el selector de "Perfil" en crear publicación).
// La red social se selecciona eligiendo la SocialAccount; no hay campo `network` separado.
export const CAMPAIGN_SOCIAL_ACCOUNTS: Record<string, string[]> = {
  c1: ['bp1', 'bp2', 'bp3'], // Campaña Verano → Zara (IG, LI, FB)
  c2: ['bp4', 'bp5'],        // Nike Run Launch → Nike (TK, IG)
  c3: [],                     // Spotify Weekly → sin cuentas en este microfront
};

export function getSocialAccountsForCampaign(campaignId: string): SocialAccount[] {
  const ids = CAMPAIGN_SOCIAL_ACCOUNTS[campaignId] ?? [];
  return ids.map((id) => getSocialAccount(id)).filter((p): p is SocialAccount => !!p);
}

export const MOCK_POSTS: MockPost[] = [
  {
    id: 'p1',
    title: 'Post lanzamiento verano',
    brandProfileId: 'bp1',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#E0A800' },
    designer: 'Rocío Rodríguez',
    status: 'borrador',
    createdAt: 'Hace 2 h',
    content:
      '✨ El verano llegó con todo. Descubre nuestra colección SS25 — piezas pensadas para vivir el calor con estilo. #ZaraSS25 #Verano2025 #Moda',
    hashtags: ['#ZaraSS25', '#Verano2025', '#Moda'],
    scheduledAt: null,
    metrics: null,
  },
  {
    id: 'p2',
    title: 'Reel Nike 30 seg',
    brandProfileId: 'bp4',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    designer: 'Alexa Delgado',
    status: 'rechazado',
    createdAt: 'Hace 28 min',
    content:
      '🏃 Corre más rápido. Vive más fuerte. El nuevo Nike Air Max 2025 ya está aquí. #NikeRun #Running #AirMax2025',
    hashtags: ['#NikeRun', '#Running', '#AirMax2025'],
    scheduledAt: null,
    metrics: null,
    rejectionReason: 'Falta una CTA clara. El reel debe terminar con un texto de acción visible.',
  },
  {
    id: 'p3',
    title: 'Carrusel colores SS25',
    brandProfileId: 'bp2',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#E0A800' },
    designer: 'Elías Bailón',
    status: 'en_revision',
    createdAt: 'Hace 5 h',
    content: 'Los colores de esta temporada, uno a uno. ¿Cuál es el tuyo? 🎨 #ZaraColors #SS25',
    hashtags: ['#ZaraColors', '#SS25'],
    scheduledAt: null,
    metrics: null,
  },
  {
    id: 'p4',
    title: 'Story promo weekend',
    brandProfileId: 'bp3',
    campaign: null,
    designer: 'Rocío Rodríguez',
    status: 'programado',
    createdAt: 'Hoy 18:00',
    content: 'Este fin de semana, descuentos en toda la colección primavera.',
    hashtags: ['#ZaraMéxico'],
    scheduledAt: 'Hoy 18:00',
    metrics: null,
  },
  {
    id: 'p5',
    title: 'Reels sustentabilidad',
    brandProfileId: 'bp5',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    designer: 'Alexa Delgado',
    status: 'publicado',
    createdAt: 'Ayer 12:00',
    content: '🌿 Moda que cuida el planeta. Colección eco-friendly SS25.',
    hashtags: ['#Nike', '#Sustentabilidad'],
    scheduledAt: 'Ayer 12:00',
    metrics: { likes: 1240, comments: 87, shares: 34, reach: 24000, engagementRate: 5.4 },
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

export const CHAR_LIMITS: Record<string, number> = {
  IG: 2200,
  TK: 2200,
  LI: 3000,
  FB: 63206,
  X: 280,
  YT: 5000,
};

// Panel IA mock (§ crear publicación) — sugerencias y horarios simulados,
// sin backend real todavía.
export const MOCK_AI_SUGGESTIONS = [
  'Agrega una llamada a la acción clara al final del copy.',
  'Reduce a 3-5 hashtags. Más de 7 reduce el alcance orgánico.',
  'Mejor horario para tu audiencia: 18:00–20:00.',
];

export const MOCK_TIME_SLOTS = ['Hoy 18:00', 'Mañana 12:00', 'Jue 09:00'];
