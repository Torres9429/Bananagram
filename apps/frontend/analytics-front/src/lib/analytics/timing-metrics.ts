// Capa NUEVA de datos (Fase 4) — hora de publicación (0-23) por fact, para
// PostingHeatMap. NO modifica mock-metrics.ts ni network-metrics.ts: publishedAt
// en SocialMetricFact es solo fecha (YYYY-MM-DD), sin hora, y no se puede tocar
// ese campo sin alterar mocks existentes — este lookup aditivo cubre esa falta.

export const MOCK_PUBLISHED_HOUR: Record<string, number> = {
  f01: 9, f02: 18, f03: 21, f04: 12, f05: 19,
  f06: 10, f07: 14,
  f08: 20, f09: 8,
  f10: 17, f11: 21, f12: 19,
  f13: 12, f14: 20, f15: 9,
  f16: 16, f17: 21, f18: 11,
  f19: 9, f20: 17, f21: 8,
  f22: 10, f23: 19, f24: 8, f25: 20,
};
