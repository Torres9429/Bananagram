import CircuitBreaker from 'opossum';

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
