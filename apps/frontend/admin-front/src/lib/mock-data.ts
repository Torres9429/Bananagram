import { AppRole } from '@repo/ui/types';
import type { SocialNetwork } from '@repo/ui/types';
import type { MockUser, MockCatalogItem, Module, Action, PrivilegeMap } from '../interfaces/interface';

// El Admin solo crea cuentas operativas (CM y Diseñador).
// El Cliente se auto-registra públicamente.
export const CREATABLE_ROLES = [AppRole.COMMUNITY_MANAGER, AppRole.DISENADOR];

export function generateMockId(prefix: string): string {
  return `${prefix}${Date.now()}`;
}

export const USER_STATUS_STYLE: Record<MockUser['status'], { bg: string; color: string; label: string }> = {
  pending: { bg: '#FFF3E0', color: '#E65100', label: 'Pendiente' },
  active: { bg: '#E8F5E9', color: '#2E7D32', label: 'Activo' },
  suspended: { bg: '#F5F5F5', color: '#616161', label: 'Suspendido' },
};

export const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: 'Ana García', email: 'ana.garcia@bananagram.com', role: AppRole.COMMUNITY_MANAGER, status: 'active', lastLogin: 'Hoy 09:12' },
  { id: 'u2', name: 'Alexa Delgado', email: 'alexa.delgado@bananagram.com', role: AppRole.DISENADOR, status: 'active', lastLogin: 'Hoy 08:40' },
  { id: 'u3', name: 'Elías Bailón', email: 'elias.bailon@bananagram.com', role: AppRole.DISENADOR, status: 'active', lastLogin: 'Ayer 17:05' },
  { id: 'u4', name: 'Rocío Rodríguez', email: 'rocio.rodriguez@zaramx.com', role: AppRole.CLIENTE, status: 'active', lastLogin: 'Ayer 16:20' },
  { id: 'u5', name: 'Marco Sosa', email: 'marco.sosa@bananagram.com', role: AppRole.ADMINISTRADOR, status: 'active', lastLogin: 'Hace 3 días' },
  { id: 'u6', name: 'Diego Ferman', email: 'diego.ferman@bananagram.com', role: AppRole.COMMUNITY_MANAGER, status: 'pending', lastLogin: 'Nunca' },
];

export const MOCK_CATEGORIES: MockCatalogItem[] = [
  { id: 'cat1', name: 'Moda', status: 'activo' },
  { id: 'cat2', name: 'Deportes', status: 'activo' },
  { id: 'cat3', name: 'Tecnología', status: 'activo' },
  { id: 'cat4', name: 'Entretenimiento', status: 'inactivo' },
];

// Valores reales del seed del backend (baseEngagementRate alimenta el cron
// job de métricas simuladas — ver modelo.txt) — ver SocialNetworkForm.tsx.
export const MOCK_SOCIAL_NETWORKS: SocialNetwork[] = [
  { id: 'sn1', name: 'Instagram', code: 'instagram', baseEngagementRate: 0.045 },
  { id: 'sn2', name: 'TikTok', code: 'tiktok', baseEngagementRate: 0.09 },
  { id: 'sn3', name: 'Facebook', code: 'facebook', baseEngagementRate: 0.02 },
  { id: 'sn4', name: 'LinkedIn', code: 'linkedin', baseEngagementRate: 0.025 },
  { id: 'sn5', name: 'X', code: 'x', baseEngagementRate: 0.015 },
  { id: 'sn6', name: 'YouTube', code: 'youtube', baseEngagementRate: 0.03, deletedAt: '2026-05-01T00:00:00.000Z' },
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
