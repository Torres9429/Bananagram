'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import { DataTable, type DataTableColumn, FormDialog, LabeledField, usePermissions } from '@repo/ui/ui';
import {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useListSpecialtiesQuery,
  useCreateSpecialtyMutation,
  useDeleteSpecialtyMutation,
} from '@repo/ui/state';
import type { CatalogItem } from '@repo/ui/types';
import { AdminTabs } from './AdminTabs';

interface CatalogListProps {
  title: string;
  kind: 'category' | 'specialty';
}

// Categorías y Especialidades comparten el mismo shape real ({id, name,
// deletedAt} — CatalogItem, soft-delete real) y el mismo par de endpoints
// (catalogs/categories | catalogs/specialties), así que un solo componente
// alterna entre los hooks de RTK Query según `kind` en vez de duplicarse.
export function CatalogList({ title, kind }: CatalogListProps) {
  const { can } = usePermissions();
  const isCategory = kind === 'category';

  const categoriesQuery = useListCategoriesQuery(undefined, { skip: !isCategory });
  const specialtiesQuery = useListSpecialtiesQuery(undefined, { skip: isCategory });
  const { data: items = [], isFetching } = isCategory ? categoriesQuery : specialtiesQuery;

  const [createCategory] = useCreateCategoryMutation();
  const [createSpecialty] = useCreateSpecialtyMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [deleteSpecialty] = useDeleteSpecialtyMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    if (isCategory) await createCategory({ name: name.trim() });
    else await createSpecialty({ name: name.trim() });
    setName('');
    setOpen(false);
  }

  // El backend solo tiene DELETE (soft-delete) — no hay endpoint para
  // reactivar, así que el switch únicamente puede apagar, nunca prender de
  // vuelta (queda deshabilitado una vez que deletedAt ya tiene valor).
  async function handleToggle(item: CatalogItem) {
    if (item.deletedAt) return;
    if (isCategory) await deleteCategory(item.id);
    else await deleteSpecialty(item.id);
  }

  const columns: DataTableColumn<CatalogItem>[] = [
    { key: 'name', header: 'Nombre', render: (item) => <Typography variant="body2" fontWeight={600}>{item.name}</Typography> },
    {
      key: 'status',
      header: 'Activo',
      align: 'right',
      render: (item) => (
        <Switch
          size="small"
          checked={!item.deletedAt}
          disabled={!!item.deletedAt || !can('catalogos', 'eliminar')}
          onChange={() => handleToggle(item)}
        />
      ),
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {can('catalogos', 'crear') && (
            <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
              + Agregar
            </Button>
          )}
        </Stack>
        <DataTable
          columns={columns}
          rows={items}
          getRowKey={(item) => item.id}
          emptyMessage={isFetching ? 'Cargando…' : `Sin elementos en ${title.toLowerCase()}.`}
        />
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
