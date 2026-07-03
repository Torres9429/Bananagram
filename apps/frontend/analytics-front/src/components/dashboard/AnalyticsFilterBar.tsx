'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import TuneIcon from '@mui/icons-material/Tune';
import { STATUS_LABELS } from '@repo/ui';
import {
  clearAllFilters,
  selectCampaign,
  selectPost,
  setProfile,
  setCategory,
  setCmName,
  setDesignerName,
  setNetworks,
  setSpecialty,
  setStatuses,
} from '../../store/analyticsFilters.slice';
import {
  selectActiveFiltersCount,
  selectAnalyticsFilters,
  selectProfileOptions,
  selectCampaignOptions,
  selectSelectedPostLabel,
} from '../../store/analytics.selectors';
import { AnalyticsFilterDrawer } from './AnalyticsFilterDrawer';
import { useDateRangeFilter } from './useDateRangeFilter';

/**
 * Encabezado de filtros del dashboard — solo período, botón "Filtros" y chips
 * activos quedan siempre visibles; todo lo demás vive en AnalyticsFilterDrawer.
 * No mantiene estado de filtro propio: lee/escribe exclusivamente sobre
 * analyticsFilters.slice (Fase 1/2, sin tocar).
 */
export function AnalyticsFilterBar() {
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = useSelector(selectAnalyticsFilters);
  const profileOptions = useSelector(selectProfileOptions);
  const campaignOptions = useSelector(selectCampaignOptions);
  const activeCount = useSelector(selectActiveFiltersCount);
  const selectedPostLabel = useSelector(selectSelectedPostLabel);
  const { dateRange, setStart, setEnd } = useDateRangeFilter();

  const selectedProfileName = profileOptions.find((b) => b.id === filters.profileId)?.name;
  const selectedCampaignName = campaignOptions.find((c) => c.id === filters.campaignId)?.name;

  return (
    <Box mb={3}>
      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
        <TextField
          type="date"
          size="small"
          label="Desde"
          value={dateRange?.start ?? ''}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="Hasta"
          value={dateRange?.end ?? ''}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        <Box sx={{ flex: 1 }} />

        <Badge color="warning" badgeContent={activeCount} invisible={activeCount === 0}>
          <Button
            variant="outlined"
            startIcon={<TuneIcon fontSize="small" />}
            onClick={() => setDrawerOpen(true)}
            sx={{ borderColor: '#E8E8E8', color: '#1A1A1A' }}
          >
            Filtros
          </Button>
        </Badge>
      </Stack>

      {activeCount > 0 && (
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" mt={1.5}>
          {filters.profileId && (
            <Chip size="small" label={selectedProfileName ?? filters.profileId} onDelete={() => dispatch(setProfile(null))} />
          )}
          {filters.networks.map((code) => (
            <Chip
              key={code}
              size="small"
              label={code}
              onDelete={() => dispatch(setNetworks(filters.networks.filter((n) => n !== code)))}
            />
          ))}
          {filters.campaignId && (
            <Chip
              size="small"
              label={selectedCampaignName ?? filters.campaignId}
              onDelete={() => dispatch(selectCampaign(null))}
            />
          )}
          {(filters.status ?? []).map((status) => (
            <Chip
              key={status}
              size="small"
              label={STATUS_LABELS[status]}
              onDelete={() => dispatch(setStatuses((filters.status ?? []).filter((s) => s !== status)))}
            />
          ))}
          {filters.dateRange && (
            <Chip
              size="small"
              label={`${filters.dateRange.start} – ${filters.dateRange.end}`}
              onDelete={() => setStart('')}
            />
          )}
          {filters.postId && (
            <Chip size="small" label={selectedPostLabel ?? filters.postId} onDelete={() => dispatch(selectPost(null))} />
          )}
          {filters.cmName && (
            <Chip size="small" label={`CM ${filters.cmName}`} onDelete={() => dispatch(setCmName(null))} />
          )}
          {filters.designerName && (
            <Chip size="small" label={`Diseñador ${filters.designerName}`} onDelete={() => dispatch(setDesignerName(null))} />
          )}
          {filters.category && (
            <Chip size="small" label={filters.category} onDelete={() => dispatch(setCategory(null))} />
          )}
          {filters.specialty && (
            <Chip size="small" label={filters.specialty} onDelete={() => dispatch(setSpecialty(null))} />
          )}

          <Button size="small" onClick={() => dispatch(clearAllFilters())} sx={{ color: '#7A5C00' }}>
            Limpiar filtros
          </Button>
        </Stack>
      )}

      <AnalyticsFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
