// `opossum` exporta CJS puro (module.exports = CircuitBreaker, sin
// __esModule ni .default) — un `import CircuitBreaker from 'opossum'`
// compila bien con tsc pero en runtime (bundlers reales tipo el de `nest
// start --watch`) resuelve a `opossum_1.default`, que no existe → crash
// ("TypeError: ... is not a constructor"). `import X = require(...)` toma
// el CJS export tal cual, sin ambigüedad de interop.
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
