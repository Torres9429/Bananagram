'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DataTable, type DataTableColumn, ProtectedAction, PrimaryButton } from '@repo/ui/ui';
import { getInitials } from '@repo/ui/utils';
import { AdminTabs } from '../../components/AdminTabs';
import { CreateUserDialog } from '../../components/CreateUserDialog';
import { MOCK_USERS, USER_STATUS_STYLE, ROLE_LABELS } from '../../lib/mock-data';
import type { MockUser } from '../../interfaces/interface';

export default function UsersPage() {
  const [users, setUsers] = useState<MockUser[]>(MOCK_USERS);
  const [createOpen, setCreateOpen] = useState(false);

  const columns: DataTableColumn<MockUser>[] = [
    {
      key: 'user',
      header: 'Usuario',
      render: (u) => (
        <Stack direction="row" gap={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', width: 36, height: 36, fontSize: 13, fontWeight: 600 }}>
            {getInitials(u.name)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
          </Box>
        </Stack>
      ),
    },
    { key: 'role', header: 'Rol', render: (u) => <Chip size="small" label={ROLE_LABELS[u.role] ?? u.role} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} /> },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => {
        const s = USER_STATUS_STYLE[u.status];
        return <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />;
      },
    },
    { key: 'lastLogin', header: 'Último acceso', render: (u) => <Typography variant="caption" color="text.secondary">{u.lastLogin}</Typography> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <ProtectedAction module="users" action="manage">
          <Tooltip title="Editar">
            <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ color: 'secondary.main' }}>
              <EditOutlinedIcon fontSize="small" />
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
          <ProtectedAction module="users" action="manage">
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              + Nuevo usuario
            </PrimaryButton>
          </ProtectedAction>
        </Stack>
        <DataTable columns={columns} rows={users} getRowKey={(u) => u.id} pagination initialPageSize={10} emptyMessage="No hay usuarios para mostrar." />
      </Box>
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(user) => setUsers((prev) => [user, ...prev])}
      />
    </Box>
  );
}
