// Copia local de apps/backend/commons/circuit-breaker/opossum.factory.ts —
// mismo criterio que JwtAuthGuard/PermissionGuard (ver CLAUDE.md): cada
// servicio duplica localmente las piezas chicas de commons/ en vez de
// importarlas por path relativo, para que sea desplegable solo (y porque
// TypeScript rechaza importar fuera de `rootDir`, ver tsconfig.json).
//
// Bug real encontrado en la Fase K: `opossum` exporta CJS puro
// (module.exports = CircuitBreaker, sin __esModule ni .default) — el
// `import CircuitBreaker from 'opossum'` de arriba compilaba bien con `tsc
// --noEmit` pero en runtime (bundler real de `nest start --watch`) resolvía
// a `opossum_1.default`, que no existe → "TypeError: opossum_1.default is
// not a constructor", crasheaba el proceso completo en cada llamada. Esta
// función nunca tuvo un caller real hasta NotificationsClient (Fase J) —
// AyrshareService la usa, pero SOCIAL_PROVIDER sigue en 'mock' toda la
// sesión (Fase F, pendiente), así que nunca se había ejercitado antes.
// `import X = require(...)` toma el CJS export tal cual, sin ambigüedad de
// interop — la única forma segura de importar esto.
import CircuitBreaker = require('opossum');

export function createCircuitBreaker<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options = {},
): CircuitBreaker {
  return new CircuitBreaker(fn, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    ...options,
  });
}
