'use client';

import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { LabeledField } from '@repo/ui/ui';
import { getInitials } from '@repo/ui/utils';
import { useListEligibleCMsQuery } from '../store/api/campaigns.api';

const RECOMMENDED_COUNT = 5;

interface CmPickerProps {
  categoryIds: string[];
  value: string | null;
  onChange: (userId: string) => void;
  // Igual que las query hooks nativas — para no consultar mientras el
  // diálogo/panel que lo contiene está cerrado.
  skip?: boolean;
}

// Extraído de CreateCampaignDialog.tsx (Fase K) para reusarlo también al
// reasignar CM tras un rechazo — RTK Query dedupe la misma query si el
// padre también llama useListEligibleCMsQuery con los mismos categoryIds
// (ej. para resolver el nombre del seleccionado), no hay doble fetch real.
export function CmPicker({ categoryIds, value, onChange, skip }: CmPickerProps) {
  const [search, setSearch] = useState('');
  const { data: eligibleCMs = [], isFetching: loadingCMs } = useListEligibleCMsQuery(categoryIds, { skip });

  const recommendedCMs = eligibleCMs.slice(0, RECOMMENDED_COUNT);
  const searchResults = search.trim()
    ? eligibleCMs.filter((cm) => cm.name.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  function renderOption(cm: (typeof eligibleCMs)[number]) {
    const active = value === cm.userId;
    return (
      <Stack
        key={cm.userId}
        direction="row"
        gap={1.5}
        alignItems="center"
        onClick={() => onChange(cm.userId)}
        sx={{
          p: 1.5,
          border: active ? '1.5px solid #E0A800' : '1px solid #E8E8E8',
          bgcolor: active ? '#FFFDE7' : '#fff',
          borderRadius: 2,
          cursor: 'pointer',
          '&:hover': { borderColor: '#E0A800' },
        }}
      >
        <Avatar src={cm.avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 600 }}>
          {getInitials(cm.name)}
        </Avatar>
        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{cm.name}</Typography>
        {active && <Chip size="small" label="Seleccionado" sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600, fontSize: 11 }} />}
      </Stack>
    );
  }

  if (loadingCMs) {
    return (
      <Stack gap={1}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
        ))}
      </Stack>
    );
  }

  if (eligibleCMs.length === 0) {
    return <Alert severity="info" sx={{ borderRadius: 2 }}>No hay Community Managers disponibles.</Alert>;
  }

  return (
    <>
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
        RECOMENDADOS
      </Typography>
      <Stack gap={1} mb={2}>
        {recommendedCMs.map(renderOption)}
      </Stack>

      <LabeledField
        label="¿Buscas a alguien en específico?"
        placeholder="Busca por nombre…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search.trim() && (
        <Stack gap={1} mt={1}>
          {searchResults.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Sin resultados para "{search}".</Typography>
          ) : (
            searchResults.map(renderOption)
          )}
        </Stack>
      )}
    </>
  );
}
