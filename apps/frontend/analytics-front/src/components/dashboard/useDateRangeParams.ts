import { useSelector } from 'react-redux';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';
import type { DateRangeParams } from '../../store/api/analytics.api';

// Traduce el dateRange del slice de filtros (string 'YYYY-MM-DD') al shape
// que esperan las queries reales (Fase Q2) — un solo lugar para no repetir
// esta conversión en cada widget que ya usa fechas reales.
export function useDateRangeParams(): DateRangeParams | undefined {
  const filters = useSelector(selectAnalyticsFilters);
  if (!filters.dateRange) return undefined;
  return { from: filters.dateRange.start, to: filters.dateRange.end };
}
