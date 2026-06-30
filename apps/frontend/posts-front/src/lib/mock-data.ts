import type { PostStatus } from '@repo/ui';
export type { PostStatus };

export interface MockCampaign {
  id: string;
  name: string;
  color: string;
  brand: string;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
}

export interface MockPost {
  id: string;
  title: string;
  network: string;
  networkBg: string;
  networkColor: string;
  campaign: { id: string; name: string; color: string } | null;
  brand: string;
  designer: string;
  status: PostStatus;
  createdAt: string;
  content: string;
  hashtags: string[];
  scheduledAt: string | null;
  metrics: PostMetrics | null;
  rejectionReason?: string;
}

export interface StatusHistoryItem {
  status: PostStatus;
  label: string;
  color: string;
  actor: string;
  role: string;
  date: string;
  comment: string | null;
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
  { id: 'c1', name: 'Campaña Verano', color: '#FDC726', brand: 'Zara MX' },
  { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5', brand: 'Nike MX' },
  { id: 'c3', name: 'Spotify Weekly', color: '#66BB6A', brand: 'Spotify MX' },
];

export const MOCK_POSTS: MockPost[] = [
  {
    id: 'p1',
    title: 'Post lanzamiento verano',
    network: 'IG',
    networkBg: '#FCE4EC',
    networkColor: '#880E4F',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#FDC726' },
    brand: 'Zara MX',
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
    network: 'TK',
    networkBg: '#E8EAF6',
    networkColor: '#283593',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    brand: 'Nike MX',
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
    network: 'LI',
    networkBg: '#E3F2FD',
    networkColor: '#0D47A1',
    campaign: { id: 'c1', name: 'Campaña Verano', color: '#FDC726' },
    brand: 'Zara MX',
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
    network: 'FB',
    networkBg: '#FFF3E0',
    networkColor: '#E65100',
    campaign: null,
    brand: 'Zara MX',
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
    network: 'IG',
    networkBg: '#FCE4EC',
    networkColor: '#880E4F',
    campaign: { id: 'c2', name: 'Nike Run Launch', color: '#42A5F5' },
    brand: 'Nike MX',
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

export const CHAR_LIMITS: Record<string, number> = {
  IG: 2200,
  TK: 2200,
  LI: 3000,
  FB: 63206,
  X: 280,
  YT: 5000,
};
