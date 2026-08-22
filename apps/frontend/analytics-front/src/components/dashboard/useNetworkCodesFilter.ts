'use client';

import { useSelector } from 'react-redux';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';

// Códigos del multi-select "Red social" del drawer — solo tiene sentido en la
// pestaña General: selectNetwork (analyticsFilters.slice.ts) ya vacía
// networks[] al entrar a la pestaña de una red específica, así que este
// filtro nunca compite con selectedNetwork.
export function useNetworkCodesFilter(): string[] | undefined {
  const filters = useSelector(selectAnalyticsFilters);
  return filters.networks.length > 0 ? filters.networks : undefined;
}
