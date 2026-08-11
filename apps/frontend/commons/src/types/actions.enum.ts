// Slugs reales de la tabla `actions` (BD auth-service), ver packages/seed/src/index.js.
// El backend no distingue "view" de "view-own" (el filtrado por dueño ya lo hace el
// propio endpoint) ni tiene "schedule"/"publish"/"manage" — usar VIEW/CREATE/APPROVE/etc.
export enum AppAction {
  VIEW = 'ver',
  CREATE = 'crear',
  EDIT = 'editar',
  DELETE = 'eliminar',
  APPROVE = 'aprobar',
  REJECT = 'rechazar',
  EXPORT = 'exportar',
  CONFIGURE = 'configurar',
  ASSIGN = 'asignar',
}
