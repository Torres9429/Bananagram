import { describe, expect, it } from '@jest/globals';
import { computeAggregateStatus } from '../services/core-service/src/scheduler/post-aggregate-status.util';
import { PostStatus } from '../services/core-service/src/types/post-status.enum';

// Función pura — sin BD ni red (auditoría §4/§18), cubre exactamente los 4
// casos que describe el diseño: todas publicado, todas error, mezcla, vacío.
describe('computeAggregateStatus', () => {
  it('todas las redes publicado → PUBLICADO', () => {
    expect(computeAggregateStatus(['publicado', 'publicado'])).toBe(PostStatus.PUBLICADO);
  });

  it('todas las redes error → ERROR', () => {
    expect(computeAggregateStatus(['error', 'error'])).toBe(PostStatus.ERROR);
  });

  it('mezcla de publicado y error → PARCIAL', () => {
    expect(computeAggregateStatus(['publicado', 'error'])).toBe(PostStatus.PARCIAL);
  });

  it('una sola red publicado → PUBLICADO (no PARCIAL con un solo resultado)', () => {
    expect(computeAggregateStatus(['publicado'])).toBe(PostStatus.PUBLICADO);
  });

  it('sin resultados → ERROR (no debería pasar en producción, pero no debe quedar indefinido)', () => {
    expect(computeAggregateStatus([])).toBe(PostStatus.ERROR);
  });
});
