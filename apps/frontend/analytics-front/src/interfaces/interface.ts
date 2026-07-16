import type { ReactNode } from 'react';
import type { BrandScore } from '@repo/ui/types';
import type { SidebarNavItem } from '@repo/ui/ui';
import type { SocialNetworkCode } from '../lib/analytics/types';
import type { store } from '../store';

export interface MockEngagementPoint {
  day: string;
  engagement: number;
  reach: number;
}

export interface MockBrandMetric {
  id: string;
  name: string;
  color: string;
  score: BrandScore;
}

// Espejo del modelo Brand → SocialAccount de brands-front/posts-front: un Post
// pertenece a una SocialAccount (cuenta de una Marca en una red), nunca tiene
// `brand`/`network` como campos propios.
export interface SocialAccount {
  id: string;
  brandName: string;
  socialNetwork: string;
}

export interface MockTopPost {
  id: string;
  title: string;
  brandProfileId: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

export interface AnalyticsFilterDrawerProps {
  open: boolean;
  onClose: () => void;
}

export interface AnalyticsDashboardLayoutProps {
  /** Fila de KPIs (Grid items ya armados, ej. <Grid item xs={12} md={3}><TrendCard .../></Grid>) */
  kpiRow: ReactNode;
  /**
   * Slot abierto para futuras secciones del dashboard (gráficas, tablas, timeline,
   * heatmap, insights, comparadores). Vacío en esta fase — solo se define el shell.
   */
  children?: ReactNode;
}

// Pestañas de primer nivel (§B.1/§B.2 del rediseño de dominio): "General" + una por
// red. El valor de cada Tab reutiliza directamente SocialNetworkCode — no existe un
// estado de tab separado del filtro de red ya existente en Redux (selectedNetwork).
export type TabValue = 'general' | SocialNetworkCode;
