'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DataTable, type DataTableColumn, ProtectedAction, PrimaryButton, ConfirmDialog, useToast } from '@repo/ui/ui';
import { formatRoleName } from '@repo/ui/utils';
import { AdminTabs } from '../../components/AdminTabs';
import { CreateUserDialog } from '../../components/CreateUserDialog';
import { useListUsersQuery, useRemoveUserMutation, type AdminUser } from '../../store/api/admin.api';

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Activo', bg: '#E8F5E9', color: '#2E7D32' },
  inactive: { label: 'Inactivo', bg: '#F5F5F5', color: '#6B6B6B' },
  suspended: { label: 'Suspendido', bg: '#FFEBEE', color: '#C62828' },
};

export default function UsersPage() {
  const { data: users = [], isLoading, isError } = useListUsersQuery();
  const [removeUser] = useRemoveUserMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const { showSuccess, showError } = useToast();

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removeUser(deleteTarget.id).unwrap();
      showSuccess(`${deleteTarget.email} eliminado.`);
    } catch {
      showError('No se pudo eliminar el usuario.');
    } finally {
      setDeleteTarget(null);
    }
  }

  const columns: DataTableColumn<AdminUser>[] = [
    { key: 'email', header: 'Correo', render: (u) => <Typography variant="body2" fontWeight={600}>{u.email}</Typography> },
    {
      key: 'roles',
      header: 'Roles',
      render: (u) => (
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {u.roles.map((r) => (
            <Chip key={r.role.id} size="small" label={formatRoleName(r.role.name)} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} />
          ))}
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => {
        const s = STATUS_STYLE[u.status] ?? { label: u.status, bg: '#F5F5F5', color: '#6B6B6B' };
        return <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />;
      },
    },
    {
      key: 'createdAt',
      header: 'Creado',
      render: (u) => <Typography variant="caption" color="text.secondary">{new Date(u.createdAt).toLocaleDateString('es-MX')}</Typography>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <ProtectedAction module="usuarios" action="eliminar">
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }} sx={{ color: '#C62828' }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ProtectedAction>
      ),
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Usuarios</Typography>
          <ProtectedAction module="usuarios" action="crear">
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              + Nuevo usuario
            </PrimaryButton>
          </ProtectedAction>
        </Stack>
        {isError ? (
          <Typography variant="body2" color="error">No se pudieron cargar los usuarios.</Typography>
        ) : (
          <DataTable
            columns={columns}
            rows={users}
            getRowKey={(u) => u.id}
            pagination
            initialPageSize={10}
            isLoading={isLoading}
            emptyMessage="No hay usuarios para mostrar."
          />
        )}
      </Box>
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        description={deleteTarget ? `Se eliminará ${deleteTarget.email} y se cerrarán sus sesiones activas.` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
