// Bug real encontrado en la Fase K (antes de revivir este paquete, en la
// copia local de core-service): `opossum` exporta CJS puro (module.exports
// = CircuitBreaker, sin __esModule ni .default) — `import CircuitBreaker
// from 'opossum'` compila bien con `tsc --noEmit` pero en runtime (bundler
// real de `nest start --watch`) resuelve a `opossum_1.default`, que no
// existe → "TypeError: opossum_1.default is not a constructor", crashea el
// proceso completo en cada llamada. `import X = require(...)` toma el
// export CJS tal cual, sin ambigüedad de interop — la única forma segura de
// importar esto.
import CircuitBreaker = require('opossum');

export function createCircuitBreaker<T>(fn: (...args: unknown[]) => Promise<T>, options = {}): CircuitBreaker {
  return new CircuitBreaker(fn, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    ...options,
  });
}
