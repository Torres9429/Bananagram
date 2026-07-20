import type { PostStatus, PostSocialAccountStatus, PostMetric, SocialNetworkCode, SocialAccount } from '@repo/ui/types';
import type { MockCampaignRecord } from '@repo/ui';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { store } from '../store';

export type { PostStatus, PostSocialAccountStatus, PostMetric, SocialNetworkCode, SocialAccount };
// Alias local — posts-front ya usaba el nombre `MockCampaign` en sus imports
// internos; MOCK_CAMPAIGNS ahora viene del mundo mock compartido
// (@repo/ui/mocks/mock-world) con forma MockCampaignRecord (Campaign +
// socialAccountIds), no un tipo propio con `color`/`brand` redefinidos.
export type { MockCampaignRecord as MockCampaign };

// Una fila por red a la que se publica el post (Capa 2 de PostSocialAccount
// en @repo/ui) — reemplaza el bloque plano MockPost.metrics de antes. Cada
// entrada trae su propio arreglo de PostMetric (Capa 3, opcional: puede no
// haber capturas todavía).
export interface MockPostSocialAccount {
  id: string;
  socialAccountId: string;
  status: PostSocialAccountStatus;
  socialPostId?: string | null;
  postUrl?: string | null;
  publishedAt?: string | null;
  errorMessage?: string | null;
  metrics?: PostMetric[];
}

// Join Post<->Media simplificado: sin `postId` redundante (ya vive como key
// dentro de MockPost.media), solo el id del archivo en MOCK_MEDIA_LIBRARY y
// su orden de aparición (ver apps/frontend/commons/src/types/media.types.ts
// PostMedia — misma idea, sin el campo postId que aquí ya es implícito).
export interface MockPostMedia {
  mediaId: string;
  order: number;
}

export interface MockPost {
  id: string;
  title: string;
  brandId: string;
  campaign: { id: string; name: string; color: string } | null;
  designer: string;
  status: PostStatus;
  createdAt: string;
  content: string;
  hashtags: string[];
  scheduledAt: string | null;
  ayrsharePostId?: string | null;
  socialAccounts: MockPostSocialAccount[];
  rejectionReason?: string;
  media?: MockPostMedia[];
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

export interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

export interface RejectPostDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export interface NetworkAvatarProps {
  network: string;
  networkBg: string;
  networkColor: string;
  size?: number;
}

export interface CampaignDotProps {
  color: string;
  name: string;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
