'use client';

import { useMemo } from 'react';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';

// SocialAccount.followers (usado antes acá) solo se actualiza cuando corre
// un sync manual de la marca (social-accounts.service.ts) — puede quedar
// desactualizado por días. El histórico de snapshots (cron cada 6h,
// account-metrics-cron.service.ts) es la fuente fresca real — mismo criterio
// que ya usa AccountGrowthOverview ("último punto conocido por red").
export function useLatestFollowers(brandId: string | undefined): Record<string, number> {
  const { data: history = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId } : ({} as never), { skip: !brandId });

  return useMemo(() => {
    const latest: Record<string, number> = {};
    for (const point of history) {
      // history viene ordenada asc (ver getBrandMetricsHistory) — el último
      // punto de cada red gana.
      latest[point.socialAccount.socialNetwork.code] = point.followers;
    }
    return latest;
  }, [history]);
}
