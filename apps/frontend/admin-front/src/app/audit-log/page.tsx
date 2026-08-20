'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { DataTable, type DataTableColumn, EmptyState, usePermissions } from '@repo/ui/ui';
import { formatDate } from '@repo/ui/utils';
import { AdminTabs } from '../../components/AdminTabs';
import { useGetAuditLogQuery, type AuditLogEntry } from '../../store/api/admin.api';

export default function AuditLogPage() {
  const { can } = usePermissions();
  const canView = can('usuarios', 'ver');
  const { data: entries = [] } = useGetAuditLogQuery(100, { skip: !canView });

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'createdAt', header: 'Fecha', width: 160, render: (e) => <Typography variant="caption" color="text.secondary">{formatDate(e.createdAt)}</Typography> },
    { key: 'performedBy', header: 'Usuario', render: (e) => <Typography variant="body2" fontWeight={600}>{e.performedBy}</Typography> },
    { key: 'action', header: 'Acción', render: (e) => <Typography variant="body2">{e.action}</Typography> },
    { key: 'tableName', header: 'Entidad', render: (e) => <Typography variant="body2" color="text.secondary">{e.tableName}{e.recordId ? ` (${e.recordId})` : ''}</Typography> },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>Bitácora de auditoría</Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          Este registro es inmutable: ningún evento puede editarse ni borrarse, solo consultarse. Muestra
          la actividad de gestión de usuarios/roles/permisos (auth-service) — las mutaciones de
          marcas/campañas/publicaciones se auditan por separado, en su propio servicio.
        </Alert>
        {!canView ? (
          <EmptyState title="Sin permiso" description="No tienes permiso para ver la auditoría (usuarios:ver)." />
        ) : (
          <DataTable columns={columns} rows={entries} getRowKey={(e) => e.id} pagination initialPageSize={10} emptyMessage="No hay eventos registrados." />
        )}
      </Box>
    </Box>
  );
}
