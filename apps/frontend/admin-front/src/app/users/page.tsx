'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DataTable, type DataTableColumn, ProtectedAction } from '@repo/ui';
import { AdminTabs } from '../../components/AdminTabs';
import { MOCK_USERS, type MockUser } from '../../lib/mock-data';

const STATUS_STYLE: Record<MockUser['status'], { bg: string; color: string; label: string }> = {
  activo: { bg: '#E8F5E9', color: '#2E7D32', label: 'Activo' },
  inactivo: { bg: '#F5F5F5', color: '#616161', label: 'Inactivo' },
};

export default function UsersPage() {
  const columns: DataTableColumn<MockUser>[] = [
    {
      key: 'user',
      header: 'Usuario',
      render: (u) => (
        <Stack direction="row" gap={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', width: 36, height: 36, fontSize: 13, fontWeight: 600 }}>
            {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
          </Box>
        </Stack>
      ),
    },
    { key: 'role', header: 'Rol', render: (u) => <Chip size="small" label={u.role} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} /> },
    { key: 'brand', header: 'Marca', render: (u) => <Typography variant="body2">{u.brand ?? '—'}</Typography> },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => {
        const s = STATUS_STYLE[u.status];
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
            <IconButton size="small" onClick={(e) => e.stopPropagation()} sx={{ color: '#D4AC40' }}>
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
            <Button variant="contained" sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}>
              + Nuevo usuario
            </Button>
          </ProtectedAction>
        </Stack>
        <DataTable columns={columns} rows={MOCK_USERS} getRowKey={(u) => u.id} />
      </Box>
    </Box>
  );
}
