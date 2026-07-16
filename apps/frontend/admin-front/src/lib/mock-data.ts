import type { MockUser, MockRole, MockAuditEntry, MockCatalogItem, Module, Action, PrivilegeMap } from '../interfaces/interface';

// El Admin solo crea cuentas operativas (CM y Diseñador).
// El Cliente se auto-registra públicamente.
export const CREATABLE_ROLES = ['CM', 'Diseñador'];

export function generateMockId(prefix: string): string {
  return `${prefix}${Date.now()}`;
}

export const USER_STATUS_STYLE: Record<MockUser['status'], { bg: string; color: string; label: string }> = {
  activo: { bg: '#E8F5E9', color: '#2E7D32', label: 'Activo' },
  inactivo: { bg: '#F5F5F5', color: '#616161', label: 'Inactivo' },
};

export const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: 'Ana García', email: 'ana.garcia@bananagram.com', role: 'CM', brand: 'Zara MX', status: 'activo', lastLogin: 'Hoy 09:12' },
  { id: 'u2', name: 'Alexa Delgado', email: 'alexa.delgado@bananagram.com', role: 'Diseñador', brand: 'Nike MX', status: 'activo', lastLogin: 'Hoy 08:40' },
  { id: 'u3', name: 'Elías Bailón', email: 'elias.bailon@bananagram.com', role: 'Diseñador', brand: 'Zara MX', status: 'activo', lastLogin: 'Ayer 17:05' },
  { id: 'u4', name: 'Rocío Rodríguez', email: 'rocio.rodriguez@zaramx.com', role: 'Cliente', brand: 'Zara MX', status: 'activo', lastLogin: 'Ayer 16:20' },
  { id: 'u5', name: 'Marco Sosa', email: 'marco.sosa@bananagram.com', role: 'Admin', brand: null, status: 'activo', lastLogin: 'Hace 3 días' },
  { id: 'u6', name: 'Diego Ferman', email: 'diego.ferman@bananagram.com', role: 'CM', brand: 'Spotify MX', status: 'inactivo', lastLogin: 'Hace 2 semanas' },
];

export const MOCK_ROLES: MockRole[] = [
  {
    id: 'r1',
    name: 'Admin',
    description: 'Acceso total a configuración, usuarios y catálogos.',
    userCount: 1,
    permissions: { publicaciones: ['crear', 'ver', 'editar', 'aprobar', 'publicar'], campanas: ['crear', 'ver', 'editar'], metricas: ['ver'], score: ['ver'], usuarios: ['crear', 'ver', 'editar'] },
  },
  {
    id: 'r2',
    name: 'CM',
    description: 'Gestiona publicaciones y campañas de las marcas asignadas.',
    userCount: 2,
    permissions: { publicaciones: ['crear', 'ver', 'programar', 'publicar'], campanas: ['ver'], metricas: ['ver'], score: ['ver'] },
  },
  {
    id: 'r3',
    name: 'Diseñador',
    description: 'Crea borradores de publicaciones para revisión del CM.',
    userCount: 2,
    permissions: { publicaciones: ['crear', 'ver'] },
  },
  {
    id: 'r4',
    name: 'Cliente',
    description: 'Aprueba o rechaza publicaciones de su marca.',
    userCount: 1,
    permissions: { publicaciones: ['ver', 'aprobar'], metricas: ['ver'], score: ['ver'] },
  },
];

export const MOCK_AUDIT_LOG: MockAuditEntry[] = [
  { id: 'a1', actor: 'Rocío Rodríguez', action: 'Rechazó publicación', entity: 'Post p2 — Reel Nike 30 seg', date: '25 jun, 16:45' },
  { id: 'a2', actor: 'Ana García', action: 'Envió a revisión', entity: 'Post p2 — Reel Nike 30 seg', date: '25 jun, 14:30' },
  { id: 'a3', actor: 'Alexa Delgado', action: 'Creó borrador', entity: 'Post p2 — Reel Nike 30 seg', date: '25 jun, 10:00' },
  { id: 'a4', actor: 'Marco Sosa', action: 'Editó permisos del rol', entity: 'Rol CM', date: '24 jun, 11:15' },
  { id: 'a5', actor: 'Marco Sosa', action: 'Creó usuario', entity: 'Diego Ferman', date: '20 jun, 09:30' },
];

export const MOCK_CATEGORIES: MockCatalogItem[] = [
  { id: 'cat1', name: 'Moda', status: 'activo' },
  { id: 'cat2', name: 'Deportes', status: 'activo' },
  { id: 'cat3', name: 'Tecnología', status: 'activo' },
  { id: 'cat4', name: 'Entretenimiento', status: 'inactivo' },
];

export const MOCK_SOCIAL_NETWORKS: MockCatalogItem[] = [
  { id: 'sn1', name: 'Instagram', status: 'activo' },
  { id: 'sn2', name: 'TikTok', status: 'activo' },
  { id: 'sn3', name: 'Facebook', status: 'activo' },
  { id: 'sn4', name: 'LinkedIn', status: 'activo' },
  { id: 'sn5', name: 'X', status: 'activo' },
  { id: 'sn6', name: 'YouTube', status: 'inactivo' },
];

export const MOCK_SPECIALTIES: MockCatalogItem[] = [
  { id: 'sp1', name: 'Diseño gráfico', status: 'activo' },
  { id: 'sp2', name: 'Copywriting', status: 'activo' },
  { id: 'sp3', name: 'Video y edición', status: 'activo' },
  { id: 'sp4', name: 'Paid media', status: 'inactivo' },
];

export const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
  cliente: 'Cliente',
};
export const ROLE_ORDER = ['administrador', 'cliente', 'community_manager', 'disenador'];

// Estado inicial de privilegios por rol (espeja mock-users.ts de commons).
export const DEFAULT_PRIVILEGES: Record<string, PrivilegeMap> = {
  administrador: {
    users: ['manage'], brands: ['manage'], catalogs: ['manage'],
    post: ['create', 'schedule', 'approve', 'reject', 'publish'],
    campaigns: ['manage'], metrics: ['view'], score: ['view'], reports: ['export'],
  },
  community_manager: {
    users: [], brands: [], catalogs: [],
    post: ['create', 'schedule', 'publish'],
    campaigns: ['view-own'], metrics: ['view'], score: ['view'], reports: [],
  },
  disenador: {
    users: [], brands: [], catalogs: [],
    post: ['create'],
    campaigns: ['view-own'], metrics: [], score: [], reports: [],
  },
  cliente: {
    users: [], brands: [], catalogs: [],
    post: ['approve', 'reject'],
    campaigns: ['create'], metrics: ['view'], score: ['view'], reports: ['export'],
  },
};

export const ACTION_LABELS: Record<Action, string> = {
  manage: 'Administrar', create: 'Crear', view: 'Ver', 'view-own': 'Ver propios',
  schedule: 'Programar', approve: 'Aprobar', reject: 'Rechazar', publish: 'Publicar', export: 'Exportar',
};

// Solo se ofrecen como switches las acciones que realmente se usan en algún rol
// para ese módulo (unión de DEFAULT_PRIVILEGES) — evita mostrar combinaciones
// sin sentido de dominio (ej. "Programar" bajo "Usuarios") y es lo que más
// reduce el amontonamiento de la pantalla anterior. No cambia qué puede
// otorgarse hoy: ningún rol tiene, en los mocks reales, una acción fuera de
// este conjunto.
export const MODULE_ACTIONS: Record<Module, Action[]> = {
  users: ['manage'],
  brands: ['manage'],
  catalogs: ['manage'],
  post: ['create', 'schedule', 'approve', 'reject', 'publish'],
  campaigns: ['manage', 'create', 'view-own'],
  metrics: ['view'],
  score: ['view'],
  reports: ['export'],
};

export const MODULE_META: Record<Module, { label: string; description: string }> = {
  users: { label: 'Usuarios', description: 'Alta, edición y activación de cuentas del sistema.' },
  brands: { label: 'Marcas', description: 'Catálogo de marcas/perfiles de cliente (legacy, ver /brands).' },
  catalogs: { label: 'Catálogos', description: 'Categorías, redes sociales y especialidades disponibles.' },
  post: { label: 'Publicaciones', description: 'Ciclo de vida de un post: crear, programar, aprobar, rechazar, publicar.' },
  campaigns: { label: 'Campañas', description: 'Creación y administración de campañas de contenido.' },
  metrics: { label: 'Métricas', description: 'Acceso a los paneles de analítica de redes sociales.' },
  score: { label: 'Score', description: 'Visualización del score digital de cada marca.' },
  reports: { label: 'Reportes', description: 'Exportación de reportes de desempeño.' },
};
