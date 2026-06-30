'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { DataTable, type DataTableColumn } from '@repo/ui';
import { AdminTabs } from './AdminTabs';
import type { MockCatalogItem } from '../lib/mock-data';

interface Props {
  title: string;
  items: MockCatalogItem[];
}

export function CatalogList({ title, items }: Props) {
  const columns: DataTableColumn<MockCatalogItem>[] = [
    { key: 'name', header: 'Nombre', render: (item) => <Typography variant="body2" fontWeight={600}>{item.name}</Typography> },
    {
      key: 'status',
      header: 'Activo',
      align: 'right',
      render: (item) => <Switch size="small" checked={item.status === 'activo'} sx={{ '& .MuiSwitch-thumb': { bgcolor: item.status === 'activo' ? '#FDC726' : undefined } }} />,
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          <Button variant="contained" sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}>
            + Agregar
          </Button>
        </Stack>
        <DataTable columns={columns} rows={items} getRowKey={(item) => item.id} />
      </Box>
    </Box>
  );
}
