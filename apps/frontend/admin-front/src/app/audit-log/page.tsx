'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { DataTable, type DataTableColumn } from '@repo/ui';
import { AdminTabs } from '../../components/AdminTabs';
import { MOCK_AUDIT_LOG, type MockAuditEntry } from '../../lib/mock-data';

export default function AuditLogPage() {
  const columns: DataTableColumn<MockAuditEntry>[] = [
    { key: 'date', header: 'Fecha', width: 140, render: (e) => <Typography variant="caption" color="text.secondary">{e.date}</Typography> },
    { key: 'actor', header: 'Usuario', render: (e) => <Typography variant="body2" fontWeight={600}>{e.actor}</Typography> },
    { key: 'action', header: 'Acción', render: (e) => <Typography variant="body2">{e.action}</Typography> },
    { key: 'entity', header: 'Entidad', render: (e) => <Typography variant="body2" color="text.secondary">{e.entity}</Typography> },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight={700}>Bitácora de auditoría</Typography>
        </Stack>
        <Alert severity="info" sx={{ mb: 2 }}>
          Este registro es inmutable: ningún evento puede editarse ni borrarse, solo consultarse.
        </Alert>
        <DataTable columns={columns} rows={MOCK_AUDIT_LOG} getRowKey={(e) => e.id} pagination initialPageSize={10} />
      </Box>
    </Box>
  );
}
