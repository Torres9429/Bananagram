'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import { DataTable, type DataTableColumn, FormDialog, LabeledField, LabeledSelect, usePermissions } from '@repo/ui/ui';
import type { SocialNetwork, SocialNetworkCode } from '@repo/ui/types';
import { useListSocialNetworksQuery, useCreateSocialNetworkMutation } from '@repo/ui/state';
import { AdminTabs } from './AdminTabs';

// Redes soportadas por el catálogo — mismos 6 valores que SocialNetworkCode
// en @repo/ui/types (nombres completos, minúsculas).
const SOCIAL_NETWORK_CODES: SocialNetworkCode[] = ['instagram', 'tiktok', 'facebook', 'x', 'linkedin', 'youtube'];

// Formulario propio para el catálogo de Redes sociales — a diferencia de
// Categorías/Especialidades (solo {id, name}, ver CatalogList.tsx), este
// catálogo necesita capturar `code` (FK conceptual usada por el resto del
// sistema para identificar la red) y `baseEngagementRate` (% base que
// alimenta el cron job de métricas simuladas — ver modelo.txt).
export function SocialNetworkForm() {
  const { can } = usePermissions();
  const { data: list = [], isFetching } = useListSocialNetworksQuery();
  const [createSocialNetwork] = useCreateSocialNetworkMutation();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState<SocialNetworkCode>('instagram');
  // Capturado como porcentaje (0-100) para que sea más claro en UI;
  // se guarda internamente como fracción (0-1), igual que en modelo.txt.
  const [ratePercent, setRatePercent] = useState('');

  async function handleAdd() {
    if (!name.trim() || !ratePercent.trim()) return;
    const baseEngagementRate = Number(ratePercent) / 100;
    if (Number.isNaN(baseEngagementRate)) return;

    await createSocialNetwork({ name: name.trim(), code, baseEngagementRate });
    setName('');
    setCode('instagram');
    setRatePercent('');
    setOpen(false);
  }

  const columns: DataTableColumn<SocialNetwork>[] = [
    { key: 'name', header: 'Nombre', render: (item) => <Typography variant="body2" fontWeight={600}>{item.name}</Typography> },
    { key: 'code', header: 'Código', render: (item) => <Chip size="small" label={item.code} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} /> },
    {
      key: 'baseEngagementRate',
      header: 'Engagement base',
      align: 'right',
      render: (item) => <Typography variant="body2">{(item.baseEngagementRate * 100).toFixed(1)}%</Typography>,
    },
    {
      key: 'status',
      header: 'Estado',
      align: 'right',
      render: (item) => (
        <Chip
          size="small"
          label={item.deletedAt ? 'Inactiva' : 'Activa'}
          sx={item.deletedAt
            ? { bgcolor: '#F5F5F5', color: '#616161', fontWeight: 600 }
            : { bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
        />
      ),
    },
  ];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>Redes sociales</Typography>
          {can('catalogos', 'crear') && (
            <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
              + Agregar
            </Button>
          )}
        </Stack>
        <DataTable columns={columns} rows={list} getRowKey={(item) => item.id} isLoading={isFetching} emptyMessage="Sin redes sociales registradas." />
      </Box>

      <FormDialog
        open={open}
        title="Agregar red social"
        confirmLabel="Agregar"
        confirmDisabled={!name.trim() || !ratePercent.trim()}
        onClose={() => setOpen(false)}
        onConfirm={handleAdd}
      >
        <LabeledField label="Nombre" placeholder="Ej. Instagram" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <LabeledSelect label="Código" value={code} onChange={(e) => setCode(e.target.value as SocialNetworkCode)}>
          {SOCIAL_NETWORK_CODES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </LabeledSelect>
        <LabeledField
          label="Engagement base (%)"
          type="number"
          placeholder="Ej. 4.5"
          value={ratePercent}
          onChange={(e) => setRatePercent(e.target.value)}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
      </FormDialog>
    </Box>
  );
}
