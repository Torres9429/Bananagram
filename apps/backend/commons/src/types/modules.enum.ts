export enum AppModule {
  CATALOGOS = 'catalogos',
  MARCAS = 'marcas',
  PUBLICACIONES = 'publicaciones',
  CALENDARIO = 'calendario',
  CAMPANAS = 'campanas',
  // Agregado 2026-08-19: generar/guardar/borrar ideas de contenido (Alexa
  // Skill + web) es una capacidad distinta de crear/editar campañas — antes
  // reusaba campanas:crear, lo que dejaba a Diseñador sin poder generar
  // ideas (solo tiene campanas:ver) pese a que sí es su trabajo. Desacoplado
  // en su propio módulo, ver packages/seed/src/index.js.
  IDEAS = 'ideas',
  METRICAS = 'metricas',
  SCORE = 'score',
  REPORTES = 'reportes',
  USUARIOS = 'usuarios',
  PRIVILEGIOS = 'privilegios',
}
