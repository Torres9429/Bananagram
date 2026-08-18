import { useSelector } from 'react-redux';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';
import { useGetBrandsQuery } from '../../store/api/analytics.api';

// Fuente de "marca activa" para las métricas de CUENTA (seguidores, score,
// crecimiento, audiencia) — independiente de si esa marca tiene campañas.
// Antes cada widget resolvía brandId como `campaigns[0]?.brandId` (se rompía
// para una marca sin campañas todavía, aunque tuviera redes conectadas con
// datos reales — ver auditoría de métricas 2026-08-17). Prioriza la marca
// elegida explícitamente en el filtro "Marca" del Drawer (`filters.profileId`,
// ya es un Brand.id real — ver AnalyticsFilterDrawer.tsx) y cae a la primera
// marca disponible del usuario — mismo criterio de fallback que
// useSelectedBrand() en brands-front.
export function useActiveBrandId(): string | undefined {
  const filters = useSelector(selectAnalyticsFilters);
  const { data: brands = [] } = useGetBrandsQuery();
  return filters.profileId ?? brands[0]?.id;
}
