export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  brand: string | null;
  status: 'activo' | 'inactivo';
  lastLogin: string;
}

export interface MockRole {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: Record<string, string[]>;
}

export interface MockAuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  date: string;
}

export interface MockCatalogItem {
  id: string;
  name: string;
  status: 'activo' | 'inactivo';
}

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
