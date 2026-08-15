import { useSelector } from 'react-redux';
import { selectSelectedNetwork } from '../../store/analytics.selectors';

// Pequeño atajo compartido por los widgets conectados a datos reales (Fase Q)
// — evita repetir el useSelector + cast en cada uno.
export function useSelectedNetwork(): string | null {
  return useSelector(selectSelectedNetwork);
}
