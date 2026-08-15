import type { PostMedia } from './media.types';

export type PostStatus =
  | 'borrador'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'rechazado_cliente' // Fase O — segundo tramo: el Cliente rechazó, el CM decide el siguiente paso
  | 'programado'
  | 'publicando'
  | 'publicado'
  | 'parcial' // al menos una red falló (ver PostSocialAccount)
  | 'error'
  | 'cancelado';

export type PostSocialAccountStatus = 'pendiente' | 'publicando' | 'publicado' | 'error' | 'cancelado';

// Capa 3 — snapshot de métricas por red por captura (cron). Todos los campos
// son opcionales: no todas las redes reportan todo.
export interface PostMetric {
  id: string;
  postSocialAccountId: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  engagement?: number; // tasa calculada: (likes+comments+shares) / reach
  capturedAt: string;
}

// Capa 2 — publicación física por red social. Un Post puede tener N de estos
// (fan-out multi-red: un mismo post se publica en varias redes a la vez, cada
// una con su propio estado) — ver docs/frontend-db-alignment.md §1.1.
export interface PostSocialAccount {
  id: string;
  postId: string;
  socialAccountId: string;
  status: PostSocialAccountStatus;
  socialPostId?: string | null; // id devuelto por la red (vía Ayrshare)
  postUrl?: string | null;
  publishedAt?: string | null;
  errorMessage?: string | null;
  metrics?: PostMetric[];
}

// Capa 1 — la intención del usuario, agnóstica de red. Ya NO tiene un campo
// de red social directo (antes brandProfileId) — el targeting multi-red vive
// en socialAccounts.
export interface Post {
  id: string;
  brandId: string;
  campaignId?: string;
  content: string;
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdBy: string;
  ayrsharePostId?: string | null; // null hasta que Ayrshare acepta el post
  socialAccounts: PostSocialAccount[];
  media?: PostMedia[]; // adjuntos (Media/PostMedia) — ver types/media.types.ts
}

// Inmutable — id es BigInt en BD; se representa como string en el frontend
// para no perder precisión al serializar (ver docs/frontend-db-alignment.md §9.4).
export interface PostStatusHistory {
  id: string;
  postId: string;
  fromStatus?: PostStatus;
  toStatus: PostStatus;
  changedBy: string;
  comment?: string; // obligatorio si toStatus = rechazado o cancelado
  createdAt: string;
}
