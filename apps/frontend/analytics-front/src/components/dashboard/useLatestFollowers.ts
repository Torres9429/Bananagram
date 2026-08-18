'use client';

import { useMemo } from 'react';
import { useGetBrandMetricsHistoryQuery } from '../../store/api/analytics.api';

// SocialAccount.followers (usado antes acá) solo se actualiza cuando corre
// un sync manual de la marca (social-accounts.service.ts) — puede quedar
// desactualizado por días. El histórico de snapshots (cron cada 6h,
// account-metrics-cron.service.ts) es la fuente fresca real — mismo criterio
// que ya usa AccountGrowthOverview ("último punto conocido por red").
//
// Devuelve `null` (no la ausencia de la clave) cuando una red no tiene
// ningún snapshot todavía — antes el caller trataba "sin entrada en el
// record" como si fuera 0 (`latestFollowers[code] ?? 0`), mezclando "0
// seguidores reales" con "todavía no tenemos el dato" (auditoría de
// métricas 2026-08-17).
export function useLatestFollowers(brandId: string | undefined): Record<string, number | null> {
  const { data: history = [] } = useGetBrandMetricsHistoryQuery(brandId ? { brandId } : ({} as never), { skip: !brandId });

  return useMemo(() => {
    const latest: Record<string, number | null> = {};
    for (const point of history) {
      // history viene ordenada asc (ver getBrandMetricsHistory) — el último
      // punto de cada red gana. point.followers es required Int en el
      // modelo (siempre un número real si el snapshot existe).
      latest[point.socialAccount.socialNetwork.code] = point.followers;
    }
    return latest;
  }, [history]);
}
