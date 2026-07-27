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
};
