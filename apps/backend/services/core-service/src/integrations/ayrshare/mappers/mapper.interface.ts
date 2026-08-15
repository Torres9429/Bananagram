// Cada mapper es una función pura (raw) => campos parciales, sin estado,
// fácil de testear unitariamente. Un campo ausente en la respuesta de esa
// red se mapea a `null`, nunca a `0` (auditoría §7: "0 es medido y vale
// cero, null es no disponible" — distinción que el resto del sistema
// depende para no mezclar datos).
export type RawMetricsResponse = Record<string, unknown>;

export interface MappedMetrics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
}

export type MetricsMapper = (raw: RawMetricsResponse) => MappedMetrics;

// Varias APIs regresan number, otras string — normaliza acá, nunca deja que
// Prisma reciba un string donde espera Int.
export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? Number(value) : value;
  return typeof num === 'number' && !Number.isNaN(num) ? num : null;
}

export function getPath(raw: RawMetricsResponse, path: string[]): unknown {
  return path.reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, raw);
}
