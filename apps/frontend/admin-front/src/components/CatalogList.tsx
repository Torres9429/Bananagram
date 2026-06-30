'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { DataTable, type DataTableColumn, FormDialog, LabeledField } from '@repo/ui';
import { AdminTabs } from './AdminTabs';
import type { MockCatalogItem } from '../lib/mock-data';

interface Props {
  title: string;
  items: MockCatalogItem[];
}

export function CatalogList({ title, items }: Props) {
  const [list, setList] = useState<MockCatalogItem[]>(items);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    setList((prev) => [{ id: `c${Date.now()}`, name: name.trim(), status: 'activo' }, ...prev]);
    setName('');
    setOpen(false);
  }

  const columns: DataTableColumn<MockCatalogItem>[] = [
    { key: 'name', header: 'Nombre', render: (item) => <Typography variant="body2" fontWeight={600}>{item.name}</Typography> },
    {
      key: 'status',
      header: 'Activo',
      align: 'right',
      render: (item) => <Switch size="small" checked={item.status === 'activo'} />,
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
            + Agregar
          </Button>
        </Stack>
        <DataTable columns={columns} rows={list} getRowKey={(item) => item.id} />
      </Box>

      <FormDialog
        open={open}
        title={`Agregar a ${title.toLowerCase()}`}
        confirmLabel="Agregar"
        confirmDisabled={!name.trim()}
        onClose={() => setOpen(false)}
        onConfirm={handleAdd}
      >
        <LabeledField label="Nombre" placeholder={`Ej. nuevo elemento de ${title.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FormDialog>
    </Box>
  );
}
