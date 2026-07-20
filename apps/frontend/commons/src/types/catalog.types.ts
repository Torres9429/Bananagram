// Base compartida por los catálogos gestionados en /catalogs (Categorías,
// Especialidades, Redes sociales...). "activo/inactivo" en UI se deriva de
// deletedAt (soft delete) — no es una columna propia en ningún catálogo de
// modelo.txt. Si un catálogo necesita campos extra (ver SocialNetwork), debe
// extender esta interfaz en vez de duplicarla.
export interface CatalogItem {
  id: string;
  name: string;
  deletedAt?: string | null;
}
