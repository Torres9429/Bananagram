// Slugs reales de la tabla `modules` (BD auth-service), ver packages/seed/src/index.js.
// Deben calzar letra por letra con lo que el backend manda en JWT.permissions / GET /me/permissions.
export enum AppModule {
  CATALOGS = 'catalogos',
  BRANDS = 'marcas',
  POST = 'publicaciones',
  CALENDAR = 'calendario',
  CAMPAIGNS = 'campanas',
  IDEAS = 'ideas',
  METRICS = 'metricas',
  SCORE = 'score',
  REPORTS = 'reportes',
  USERS = 'usuarios',
  PRIVILEGES = 'privilegios',
}
