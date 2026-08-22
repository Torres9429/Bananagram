import { useDispatch, useSelector } from 'react-redux';
import { setDateRange } from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';

/**
 * Hook pequeño y reutilizable para los dos campos de fecha (Desde/Hasta), usados
 * tanto en la barra compacta como dentro del Drawer — evita duplicar la lógica
 * de armar el DateRange en dos componentes. No agrega estado propio: lee y
 * escribe directamente sobre analyticsFilters.slice.
 */
export function useDateRangeFilter() {
  const dispatch = useDispatch();
  const { dateRange } = useSelector(selectAnalyticsFilters);

  function setStart(value: string) {
    if (!value) return dispatch(setDateRange(null));
    dispatch(setDateRange({ start: value, end: dateRange?.end ?? value }));
  }

  function setEnd(value: string) {
    if (!value) return dispatch(setDateRange(null));
    dispatch(setDateRange({ start: dateRange?.start ?? value, end: value }));
  }

  return { dateRange, setStart, setEnd };
}
