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

  // Antes "RECOMENDADOS" mostraba el top 5 sin importar matchScore — con
  // pocos CM en el sistema, eso significaba mostrar gente sin ninguna
  // categoría en común como si calzara (reportado en vivo: "siempre salen
  // los mismos"). Ahora, si hay algún criterio real (categoría de campaña o
  // de marca), solo entran los que de verdad tienen matchScore>0 — sin
  // criterio (ninguna categoría elegida ni la marca tiene una), no hay nada
  // que filtrar, se muestra el universo completo como antes.
  const hasCriteria = categoryIds.length > 0;
  const matchingCMs = hasCriteria ? eligibleCMs.filter((cm) => cm.matchScore > 0) : eligibleCMs;
  const recommendedCMs = matchingCMs.slice(0, RECOMMENDED_COUNT);
  // El buscador sigue sobre TODO el universo elegible, no solo los que
  // matchean — encontrar a alguien específico no debería depender de que
  // tenga la categoría marcada (matching es orientativo, no restrictivo,
  // regla de negocio #8).
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
      {recommendedCMs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
          Ningún Community Manager tiene esta categoría todavía — busca por nombre para elegir a cualquiera.
        </Alert>
      ) : (
        <Stack gap={1} mb={2}>
          {recommendedCMs.map(renderOption)}
        </Stack>
      )}

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
