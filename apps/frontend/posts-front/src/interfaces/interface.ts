import type { PostStatus } from '@repo/ui/types';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { store } from '../store';

export type { PostStatus };

export type SocialNetworkCode = 'IG' | 'TK' | 'LI' | 'FB' | 'X' | 'YT';

// Espejo del modelo de brands-front (Brand → SocialAccount): cada microfront
// mantiene su propia copia de mocks porque no hay un servicio compartido,
// pero el concepto y la forma son los mismos. Un Post pertenece a una
// SocialAccount (una cuenta de una Marca en una red social específica),
// nunca tiene un campo `network`/`brand` propio.
export interface SocialAccount {
  id: string;
  brandName: string;
  socialNetwork: SocialNetworkCode;
  handle: string;
  networkBg: string;
  networkColor: string;
}

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
  brandProfileId: string;
  campaign: { id: string; name: string; color: string } | null;
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
