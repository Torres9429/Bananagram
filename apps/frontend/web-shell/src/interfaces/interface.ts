import type { ReactNode } from 'react';
import type { PostStatus } from '@repo/ui/types';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { ChipProps as MuiChipProps } from '@mui/material/Chip';
import type { ButtonProps } from '@mui/material/Button';
import type { store } from '../store';

export interface MockCampaignSummary {
  id: string;
  name: string;
  color: string;
  progress: number;
}

export interface SocialAccount {
  id: string;
  socialNetwork: string;
}

export interface MockRecentPost {
  id: string;
  title: string;
  status: PostStatus;
  brandProfileId: string;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

// ── Landing: atoms ──────────────────────────────────────────────
export type ChipTone = 'neutral' | 'primary' | 'success' | 'info' | 'warning';

export interface ChipProps extends Omit<MuiChipProps, 'color'> {
  tone?: ChipTone;
}

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export type LandingButtonVariant = 'primary' | 'secondary';

export interface LandingButtonProps extends Omit<ButtonProps, 'variant' | 'color'> {
  variant?: LandingButtonVariant;
}

// ── Landing: molecules ──────────────────────────────────────────
export interface HeroActionProps {
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

export interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
}

export interface MarqueeProps {
  items: string[];
}

export type FeatureCardTone = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

export interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  visual?: ReactNode;
  tone?: FeatureCardTone;
}

// ── Landing: organisms ──────────────────────────────────────────
export interface NetworkActivity {
  code: string;
  name: string;
  tone: 'primary' | 'success' | 'info';
  posts: number;
  engagement: string;
  fill: number;
}

export interface TimelineStep {
  status: string;
  tone: BadgeTone;
  description: string;
  timestamp: string;
}

export interface FlowNode {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface VineLeaf {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
}

export interface VineSpec {
  top: { x: number; y: number };
  path: string;
  leaves: VineLeaf[];
}
