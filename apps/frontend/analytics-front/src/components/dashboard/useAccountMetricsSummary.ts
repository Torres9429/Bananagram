'use client';

import { useMemo } from 'react';
import { useGetAccountMetricsSummaryQuery, type AccountNetworkSummary } from '../../store/api/analytics.api';
import { useActiveBrandId } from './useActiveBrandId';
import { useDateRangeParams } from './useDateRangeParams';
import { useNetworkCodesFilter } from './useNetworkCodesFilter';

export interface AccountMetricsCardData {
  followers: number | null;
  posts: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  engagementRate: number | null;
}

const sum = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
};

// Interacciones (likes+comments+shares) no viene precalculado del backend —
// se deriva acá. null solo cuando NINGUNO de los 3 está disponible para esa
// red (mismo criterio "null = sin dato" del resto del sistema); si al menos
// uno sí llegó, los ausentes cuentan como 0, no se descarta la suma entera.
function deriveInteractions(n: Pick<AccountNetworkSummary, 'likes' | 'comments' | 'shares'>): number | null {
  if (n.likes === null && n.comments === null && n.shares === null) return null;
  return (n.likes ?? 0) + (n.comments ?? 0) + (n.shares ?? 0);
}

// Combina varias redes en un único total — replica a propósito el mismo
// criterio que SocialAccountsService.getAccountMetricsSummary aplica en el
// backend (sumas simples de conteos, pero el RATIO de engagement solo entre
// redes con reach propio válido, nunca mezclando interacciones de una red
// sin reach contra el reach de otra). Se recalcula acá (no se usa el
// `summary` que ya trae el backend) porque el filtro de red del Drawer
// (multi-select, solo en "General") es client-side — mismo patrón que ya
// usa sumMetrics() para el lado campaign-scoped — así que el combinado debe
// poder recomputarse para cualquier subconjunto de `byNetwork`, no solo el
// total de todas las redes.
function combine(networks: AccountNetworkSummary[]): AccountMetricsCardData {
  const withReach = networks.filter((n) => n.reach !== null && n.reach > 0);
  const ratioInteractions = sum(withReach.map((n) => (n.likes ?? 0) + (n.comments ?? 0) + (n.shares ?? 0)));
  const ratioReach = sum(withReach.map((n) => n.reach));
  const engagementRate =
    ratioInteractions !== null && ratioReach !== null && ratioReach > 0
      ? Math.round((ratioInteractions / ratioReach) * 100 * 100) / 100
      : null;

  return {
    followers: sum(networks.map((n) => n.followers)),
    posts: sum(networks.map((n) => n.posts)),
    likes: sum(networks.map((n) => n.likes)),
    comments: sum(networks.map((n) => n.comments)),
    shares: sum(networks.map((n) => n.shares)),
    views: sum(networks.map((n) => n.views)),
    reach: sum(networks.map((n) => n.reach)),
    interactions: sum(networks.map((n) => deriveInteractions(n))),
    engagementRate,
  };
}

// Fuente única para las tarjetas ancla de /metrics (Publicaciones/Alcance/
// Engagement/Interacciones/Seguidores/Vistas) — cubre TODA la cuenta
// conectada, con o sin campañas (a diferencia de sumMetrics(), acotado a
// Post/PostMetric de campañas creadas en Bananagram). Usado por
// NetworkOverview y AccountGrowthOverview para que ambos muestren
// exactamente el mismo número, nunca dos cálculos separados del mismo dato.
//
// networkCode: red de una pestaña específica (Instagram, TikTok, ...), o
// null en "General" — ahí sí aplica el multi-select "Red social" del Drawer
// (useNetworkCodesFilter), único lugar donde ese filtro afecta estos datos.
export function useAccountMetricsSummary(networkCode: string | null): {
  data: AccountMetricsCardData | null;
  hasData: boolean;
  isLoading: boolean;
} {
  const brandId = useActiveBrandId();
  const range = useDateRangeParams();
  const networkCodesFilter = useNetworkCodesFilter();
  const { data, isLoading } = useGetAccountMetricsSummaryQuery(brandId ? { brandId, range } : ({} as never), { skip: !brandId });

  return useMemo(() => {
    const byNetwork = data?.byNetwork ?? [];

    if (networkCode) {
      const found = byNetwork.find((n) => n.networkCode === networkCode);
      if (!found) return { data: null, hasData: false, isLoading };
      return { data: combine([found]), hasData: true, isLoading };
    }

    const filtered = networkCodesFilter ? byNetwork.filter((n) => networkCodesFilter.includes(n.networkCode)) : byNetwork;
    if (filtered.length === 0) return { data: null, hasData: false, isLoading };
    return { data: combine(filtered), hasData: true, isLoading };
  }, [data, networkCode, networkCodesFilter, isLoading]);
}
