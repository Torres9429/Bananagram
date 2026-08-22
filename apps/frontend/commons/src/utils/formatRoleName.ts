// `Role.name` en BD es un slug (community_manager, disenador...), sin
// espacios ni acentos — no apto para mostrar directo en UI (ver
// admin-front/roles y brands-front/profile). Un mapa de overrides cubre los
// 4 roles actuales con su ortografía correcta ("Diseñador", no "Disenador");
// cualquier rol futuro creado desde /admin-front/roles cae al formateo
// genérico (snake_case → Title Case) sin necesitar tocar código.
const ROLE_NAME_OVERRIDES: Record<string, string> = {
  administrador: 'Administrador',
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
  cliente: 'Cliente',
};

export function formatRoleName(slug: string): string {
  if (ROLE_NAME_OVERRIDES[slug]) return ROLE_NAME_OVERRIDES[slug];
  return slug
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
