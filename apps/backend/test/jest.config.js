// Sin jest.config.js en el resto del repo (ver CLAUDE.md), pero este paquete
// sí lo necesita: importa fuentes TS de auth-service/core-service
// directamente (mismo patrón que db.helper.ts), y jest por defecto no
// transforma TypeScript sin ts-jest configurado.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFiles: ['<rootDir>/env-setup.js'],
  // Varios specs (auth.integration/campaigns-flow) llaman cleanDatabase()
  // sobre la misma Postgres real — correrlos en paralelo (default de Jest)
  // hace que un archivo borre filas que otro está usando a la mitad de una
  // prueba (FK violation intermitente en refresh_tokens). Un solo worker
  // evita la condición de carrera; no hay tests puramente unitarios que
  // dependan de paralelismo para ser rápidos.
  maxWorkers: 1,
};
