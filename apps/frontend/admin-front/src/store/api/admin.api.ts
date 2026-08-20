import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from '@repo/ui/state';

// auth-service.User no tiene name/firstName/lastName (ese display name vive
// en UserProfile, en core-service — servicios distintos, sin join real entre
// sí) — el admin solo puede mostrar/editar lo que auth-service realmente
// tiene: email, estado y roles.
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

export interface CreateUserRequest {
  email: string;
  password: string;
  roleName: string;
}

export interface UpdateUserRequest {
  email?: string;
  status?: string;
}

export interface AdminModule {
  id: string;
  slug: string;
  name: string;
}

export interface AdminAction {
  id: string;
  slug: string;
  name: string;
}

export interface RolePermission {
  module: AdminModule;
  action: AdminAction;
}

export interface AdminRole {
  id: string;
  name: string;
  permissions: RolePermission[];
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

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['AdminUser', 'AdminRole', 'AuditLog'],
  endpoints: (builder) => ({
    listUsers: builder.query<AdminUser[], string | void>({
      query: (roleName) => (roleName ? `admin/users?roleName=${roleName}` : 'admin/users'),
      providesTags: ['AdminUser'],
    }),
    createUser: builder.mutation<AdminUser, CreateUserRequest>({
      query: (body) => ({ url: 'admin/users', method: 'POST', body }),
      invalidatesTags: ['AdminUser'],
    }),
    updateUser: builder.mutation<AdminUser, { id: string; body: UpdateUserRequest }>({
      query: ({ id, body }) => ({ url: `admin/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['AdminUser'],
    }),
    removeUser: builder.mutation<{ removed: boolean }, string>({
      query: (id) => ({ url: `admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminUser'],
    }),
    assignRole: builder.mutation<AdminUser, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({ url: `admin/users/${userId}/roles`, method: 'POST', body: { roleId } }),
      invalidatesTags: ['AdminUser'],
    }),
    unassignRole: builder.mutation<AdminUser, { userId: string; roleId: string }>({
      query: ({ userId, roleId }) => ({ url: `admin/users/${userId}/roles/${roleId}`, method: 'DELETE' }),
      invalidatesTags: ['AdminUser'],
    }),

    listRoles: builder.query<AdminRole[], void>({
      query: () => 'admin/roles',
      providesTags: ['AdminRole'],
    }),
    createRole: builder.mutation<AdminRole, { name: string }>({
      query: (body) => ({ url: 'admin/roles', method: 'POST', body }),
      invalidatesTags: ['AdminRole'],
    }),
    listModules: builder.query<AdminModule[], void>({
      query: () => 'admin/modules',
    }),
    listActions: builder.query<AdminAction[], void>({
      query: () => 'admin/actions',
    }),
    // Toggle individual — no hay concepto de "guardar en lote" en el backend
    // (role_permissions se edita fila por fila), cada cambio persiste al
    // momento en vez de acumularse en estado local hasta un botón "Guardar".
    updateRolePermission: builder.mutation<
      void,
      { roleId: string; moduleSlug: string; actionSlug: string; allowed: boolean }
    >({
      query: ({ roleId, moduleSlug, actionSlug, allowed }) => ({
        url: `admin/roles/${roleId}/permissions`,
        method: 'PATCH',
        body: { moduleSlug, actionSlug, allowed },
      }),
      invalidatesTags: ['AdminRole'],
    }),

    getAuditLog: builder.query<AuditLogEntry[], number | void>({
      query: (limit) => (limit ? `admin/audit-log?limit=${limit}` : 'admin/audit-log'),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useRemoveUserMutation,
  useAssignRoleMutation,
  useUnassignRoleMutation,
  useListRolesQuery,
  useCreateRoleMutation,
  useListModulesQuery,
  useListActionsQuery,
  useUpdateRolePermissionMutation,
  useGetAuditLogQuery,
} = adminApi;
