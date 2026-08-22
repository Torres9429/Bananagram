'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import CircularProgress from '@mui/material/CircularProgress';
import TuneIcon from '@mui/icons-material/Tune';
import { STATUS_LABELS, useToast } from '@repo/ui/ui';
import {
  clearAllFilters,
  selectCampaign,
  selectNetwork,
  selectPost,
  setProfile,
  setCategory,
  setCmName,
  setDesignerName,
  setNetworks,
  setSpecialty,
  setStatuses,
} from '../../store/analyticsFilters.slice';
import { selectActiveFiltersCount, selectAnalyticsFilters, selectSelectedNetwork, selectSelectedPostLabel } from '../../store/analytics.selectors';
import { useGetBrandsQuery, useGetCampaignsMetricsSummaryQuery } from '../../store/api/analytics.api';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import { AnalyticsFilterDrawer } from './AnalyticsFilterDrawer';
import { useDateRangeFilter } from './useDateRangeFilter';

/**
 * Encabezado de filtros del dashboard — solo período, botón "Filtros" y chips
 * activos quedan siempre visibles; todo lo demás vive en AnalyticsFilterDrawer.
 * No mantiene estado de filtro propio: lee/escribe exclusivamente sobre
 * analyticsFilters.slice. Los nombres de los chips (marca/campaña) salen de
 * datos reales (GET /brands, GET /campaigns/metrics-summary), ya cacheados
 * por el Drawer/los widgets — no dispara peticiones nuevas.
 */
export function AnalyticsFilterBar() {
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { showInfo } = useToast();

  const filters = useSelector(selectAnalyticsFilters);
  const activeCount = useSelector(selectActiveFiltersCount);
  const selectedNetwork = useSelector(selectSelectedNetwork);
  const selectedPostLabel = useSelector(selectSelectedPostLabel);
  const { dateRange, setStart, setEnd } = useDateRangeFilter();

  const { data: brands = [], isLoading: isBrandsLoading, isFetching: isBrandsFetching } = useGetBrandsQuery();
  const { data: campaigns = [], isLoading: isCampaignsLoading, isFetching: isCampaignsFetching } = useGetCampaignsMetricsSummaryQuery();
  const isFilterOptionsLoading = isBrandsLoading || isBrandsFetching || isCampaignsLoading || isCampaignsFetching;

  const selectedProfileName = brands.find((b) => b.id === filters.profileId)?.name;
  const selectedCampaignName = campaigns.find((c) => c.campaignId === filters.campaignId)?.name;

  return (
    <Box mb={3}>
      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
        {/* Desde/Hasta ya están duplicados dentro de AnalyticsFilterDrawer —
            en mobile se ocultan aquí para no competir por espacio con el
            botón de Filtros (se agrupan ahí en vez de "envolver" sueltos). */}
        <TextField
          type="date"
          size="small"
          label="Desde"
          value={dateRange?.start ?? ''}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150, display: { xs: 'none', sm: 'flex' } }}
        />
        <TextField
          type="date"
          size="small"
          label="Hasta"
          value={dateRange?.end ?? ''}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150, display: { xs: 'none', sm: 'flex' } }}
        />

        <Box sx={{ flex: 1 }} />

        <Badge color="warning" badgeContent={activeCount} invisible={activeCount === 0}>
          <Button
            variant="outlined"
            startIcon={<TuneIcon fontSize="small" />}
            onClick={() => setDrawerOpen(true)}
            disabled={isFilterOptionsLoading}
            sx={{ borderColor: 'divider', color: '#1A1A1A' }}
          >
            Filtros
          </Button>
        </Badge>

        {isFilterOptionsLoading && <CircularProgress size={18} />}
      </Stack>

      {/* Antes esta fila se confundía con el resto de la barra (mismo fondo,
          sin rótulo) — feedback del usuario pidiendo más presencia de
          "filtros activos", como los chips siempre visibles del ejemplo
          Dashboard drill. Fondo propio + rótulo para que se note de un
          vistazo qué es exactamente lo que está filtrando el dashboard
          ahora mismo. */}
      {activeCount > 0 && (
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          alignItems="center"
          mt={1.5}
          sx={{ p: 1.25, bgcolor: '#FFF8E1', border: '1px solid', borderColor: 'primary.light', borderRadius: 2 }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
            Filtrando por:
          </Typography>
          {filters.profileId && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={selectedProfileName ?? 'Marca'} onDelete={() => dispatch(setProfile(null))} />
          )}
          {/* Antes solo se mostraban aquí filters.networks (multi-select del
              Drawer) — filters.selectedNetwork (la tab activa, incluido lo
              que se fija haciendo clic en una gráfica) no tenía chip propio,
              pese a ser también un filtro activo real (ya contado en
              selectActiveFiltersCount). */}
          {selectedNetwork && (
            <Chip
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
              label={NETWORK_DISPLAY[selectedNetwork as keyof typeof NETWORK_DISPLAY]?.label ?? selectedNetwork}
              onDelete={() => dispatch(selectNetwork(null))}
            />
          )}
          {filters.networks.map((code) => (
            <Chip
              key={code}
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
              label={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code}
              onDelete={() => dispatch(setNetworks(filters.networks.filter((n) => n !== code)))}
            />
          ))}
          {filters.campaignId && (
            <Chip
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
              label={selectedCampaignName ?? 'Campaña'}
              onDelete={() => dispatch(selectCampaign(null))}
            />
          )}
          {filters.postId && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={selectedPostLabel ?? filters.postId} onDelete={() => dispatch(selectPost(null))} />
          )}
          {(filters.status ?? []).map((status) => (
            <Chip
              key={status}
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
              label={STATUS_LABELS[status]}
              onDelete={() => dispatch(setStatuses((filters.status ?? []).filter((s) => s !== status)))}
            />
          ))}
          {filters.dateRange && (
            <Chip
              size="small"
              variant="outlined"
              sx={{ bgcolor: 'white' }}
              label={`${filters.dateRange.start} – ${filters.dateRange.end}`}
              onDelete={() => setStart('')}
            />
          )}
          {filters.cmName && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={`CM ${filters.cmName}`} onDelete={() => dispatch(setCmName(null))} />
          )}
          {filters.designerName && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={`Diseñador ${filters.designerName}`} onDelete={() => dispatch(setDesignerName(null))} />
          )}
          {filters.category && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={filters.category} onDelete={() => dispatch(setCategory(null))} />
          )}
          {filters.specialty && (
            <Chip size="small" variant="outlined" sx={{ bgcolor: 'white' }} label={filters.specialty} onDelete={() => dispatch(setSpecialty(null))} />
          )}

          <Button
            size="small"
            onClick={() => {
              dispatch(clearAllFilters());
              showInfo('Filtros limpiados.');
            }}
            sx={{ color: 'primary.contrastTextMuted' }}
          >
            Limpiar filtros
          </Button>
        </Stack>
      )}

      <AnalyticsFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
