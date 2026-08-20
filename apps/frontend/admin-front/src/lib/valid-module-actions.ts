// Combinaciones módulo×acción con backing real (endpoint de backend que
// realmente las verifica) — fuente: auditoría 2026-08-17
// (docs/2026-08-17-auditoria-permisos-roles-privilegios.md), verificada
// contra @RequirePermission real en los 3 servicios, no copiada a ciegas.
//
// Discrepancias encontradas contra la lista de referencia inicial y
// resueltas usando la implementación real (regla explícita del pedido):
// - usuarios: se excluye 'asignar'. Los endpoints reales de asignar/quitar
//   rol (POST/DELETE /admin/users/:id/roles) están gateados por
//   'usuarios:editar', no por un 'usuarios:asignar' propio — ese par no
//   tiene ningún efecto si se asigna, así que no se ofrece como opción.
// - calendario: ausente por completo a propósito. Ningún endpoint de
//   ningún servicio usa 'calendario:*' (confirmado exhaustivamente en la
//   auditoría) — no se inventa ninguna combinación para este módulo. Se
//   deja como decisión aparte, no se toca el módulo ni sus permisos ya
//   asignados en el seed.
// - ideas: agregado 2026-08-20 — módulo real desde 2026-08-19 (separado de
//   campanas:crear específicamente para que Diseñador pudiera generar ideas
//   sin necesitar permiso de campañas), con backing real en
//   alexa-service/src/ideas/ideas.controller.ts (ver/crear) y
//   ai-service/src/ai/ai.controller.ts (POST ai/generate-ideas, crear). No
//   estaba en la auditoría original del 2026-08-17 porque el módulo no
//   existía todavía en esa fecha.
//
// No agregar combinaciones nuevas aquí sin volver a verificar contra un
// @RequirePermission real — este archivo existe justamente para evitar que
// la UI ofrezca permisos "de papel" sin ningún endpoint detrás.
export const VALID_MODULE_ACTIONS: Record<string, string[]> = {
  catalogos: ['ver', 'crear', 'editar', 'eliminar'],
  marcas: ['ver', 'crear', 'editar', 'eliminar'],
  publicaciones: ['ver', 'crear', 'editar', 'aprobar', 'rechazar'],
  campanas: ['ver', 'crear', 'editar', 'aprobar', 'rechazar', 'asignar'],
  ideas: ['ver', 'crear'],
  metricas: ['ver', 'exportar'],
  score: ['ver'],
  reportes: ['ver', 'exportar'],
  usuarios: ['ver', 'crear', 'editar', 'eliminar'],
  // 'crear' agregado: POST /admin/roles ya existe (crear rol nuevo desde la
  // matriz de administración), gateado por privilegios:crear.
  privilegios: ['ver', 'crear', 'editar'],
};
