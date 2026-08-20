import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './authenticated-base-query';

// Subconjunto de solo lectura de admin-front's admin.api.ts (que sigue
// teniendo el CRUD completo, propio de esa zona) — este vive en commons
// porque web-shell (DashboardAdmin) también necesita leer usuarios/roles/
// auditoría real, y las zonas de Multi-Zones no se importan código entre sí,
// solo consumen @repo/ui. Mismo criterio que catalogsApi.

export interface AdminUserRole {
  role: { id: string; name: string };
}

export interface AdminUser {
  id: string;
  email: string;
  status: string;
  roles: AdminUserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
}

export interface AuditLogEntry {
  id: string;
  tableName: string;
  recordId: string | null;
  action: string;
  performedBy: string;
  requestId: string | null;
  createdAt: string;
}

export const sharedAdminApi = createApi({
  reducerPath: 'sharedAdminApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['AdminUser', 'AdminRole', 'AuditLog'],
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUser[], void>({
      query: () => 'admin/users',
      providesTags: ['AdminUser'],
    }),
    listRoles: builder.query<AdminRole[], void>({
      query: () => 'admin/roles',
      providesTags: ['AdminRole'],
    }),
    // Solo el audit_log de auth-service (gestión de usuarios/roles/permisos)
    // — el de core-service (marcas/campañas/posts) se escribe igual de real
    // en su propia base, pero no se agrega en esta vista, decisión de
    // alcance explícita (ver plan de implementación).
    getAuditLog: builder.query<AuditLogEntry[], number | void>({
      query: (limit) => (limit ? `admin/audit-log?limit=${limit}` : 'admin/audit-log'),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const { useListUsersQuery, useListRolesQuery, useGetAuditLogQuery } = sharedAdminApi;
