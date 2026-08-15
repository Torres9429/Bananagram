'use client';

import { useDispatch, useSelector } from 'react-redux';
import type { SelectChangeEvent } from '@mui/material/Select';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LabeledSelect, LabeledField, STATUS_LABELS, PrimaryButton } from '@repo/ui/ui';
import {
  clearAllFilters,
  selectCampaign,
  setProfile,
  setCategory,
  setCmName,
  setDesignerName,
  setNetworks,
  setSpecialty,
  setStatuses,
} from '../../store/analyticsFilters.slice';
import { selectAnalyticsFilters } from '../../store/analytics.selectors';
import { useGetBrandsQuery, useGetCampaignsMetricsSummaryQuery, useGetBrandSocialAccountsQuery } from '../../store/api/analytics.api';
import { NETWORK_DISPLAY } from '../../lib/analytics/network-config';
import {
  MOCK_CATEGORY_OPTIONS,
  MOCK_CM_OPTIONS,
  MOCK_DESIGNER_OPTIONS,
  MOCK_SPECIALTY_OPTIONS,
} from '../../lib/mock-data';
import type { PostStatus, SocialNetworkCode } from '../../lib/analytics/types';
import type { AnalyticsFilterDrawerProps } from '../../interfaces/interface';
import { useDateRangeFilter } from './useDateRangeFilter';

const ALL_STATUSES: PostStatus[] = [
  'borrador',
  'en_revision',
  'aprobado',
  'rechazado',
  'programado',
  'publicando',
  'publicado',
  'parcial',
  'error',
  'cancelado',
];

// Estado/CM/Diseñador/Categoría/Especialidad siguen sin dato real detrás
// (equipo por publicación, catálogo de categorías) — se oculta la sección
// completa en vez de mostrar controles deshabilitados; un solo flag para
// reactivarla cuando exista el dato.
const SHOW_ADVANCED_FILTERS = false;

/**
 * Drawer lateral (desktop) / Bottom sheet (mobile) con el detalle completo de filtros.
 * Marca/Campaña/Red social ya filtran datos reales (ver useFilteredCampaigns/
 * useNetworkCodesFilter, consumidos por los widgets) — las opciones de cada
 * uno también salen de datos reales, no del dataset mock viejo.
 */
export function AnalyticsFilterDrawer({ open, onClose }: AnalyticsFilterDrawerProps) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const filters = useSelector(selectAnalyticsFilters);
  const { dateRange, setStart, setEnd } = useDateRangeFilter();

  const { data: brands = [] } = useGetBrandsQuery();
  const { data: allCampaigns = [] } = useGetCampaignsMetricsSummaryQuery();
  // Una campaña filtrada no debe ocultar sus propias opciones — se listan
  // sobre el universo completo, acotado solo por la Marca elegida (si hay).
  const campaignOptions = filters.profileId ? allCampaigns.filter((c) => c.brandId === filters.profileId) : allCampaigns;
  // Mismo criterio que arma los Tabs en metrics/page.tsx: redes realmente
  // conectadas de la marca activa, no una lista fija de 6.
  const networkBrandId = filters.profileId ?? allCampaigns[0]?.brandId;
  const { data: socialAccounts = [] } = useGetBrandSocialAccountsQuery(networkBrandId ?? '', { skip: !networkBrandId });
  const networkOptions = Array.from(new Set(socialAccounts.filter((a) => a.active).map((a) => a.socialNetwork.code)));

  function handleNetworksChange(event: SelectChangeEvent<unknown>) {
    dispatch(setNetworks(event.target.value as SocialNetworkCode[]));
  }

  function handleStatusesChange(event: SelectChangeEvent<unknown>) {
    dispatch(setStatuses(event.target.value as PostStatus[]));
  }

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 420,
          maxWidth: '100%',
          maxHeight: isMobile ? '85vh' : '100%',
          borderTopLeftRadius: isMobile ? 20 : 0,
          borderTopRightRadius: isMobile ? 20 : 0,
        },
      }}
    >
      <Box sx={{ p: 3, overflowY: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Filtros</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          Filtros básicos
        </Typography>

        <Box mt={1.5}>
          {/* Solo tiene sentido elegir si hay más de una marca — con una sola,
              ya está implícita en todo lo demás. */}
          {brands.length > 1 && (
            <LabeledSelect
              label="Marca"
              displayEmpty
              value={filters.profileId ?? ''}
              onChange={(e) => dispatch(setProfile((e.target.value as string) || null))}
            >
              <MenuItem value="">Todas las marcas</MenuItem>
              {brands.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </LabeledSelect>
          )}

          <LabeledSelect
            label="Campaña"
            displayEmpty
            value={filters.campaignId ?? ''}
            onChange={(e) => dispatch(selectCampaign((e.target.value as string) || null))}
          >
            <MenuItem value="">Todas las campañas</MenuItem>
            {campaignOptions.map((c) => (
              <MenuItem key={c.campaignId} value={c.campaignId}>{c.name}</MenuItem>
            ))}
          </LabeledSelect>

          {/* Oculto en la pestaña de una red específica: esa pestaña ya ES el
              filtro de red, tenerlos los dos a la vez sería redundante/confuso. */}
          {!filters.selectedNetwork && (
            <LabeledSelect
              label="Red social"
              multiple
              displayEmpty
              value={filters.networks}
              onChange={handleNetworksChange}
              renderValue={(selected) =>
                (selected as string[]).length > 0
                  ? (selected as string[]).map((code) => NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code).join(', ')
                  : 'Todas las redes'
              }
            >
              {networkOptions.map((code) => (
                <MenuItem key={code} value={code}>
                  <Checkbox size="small" checked={filters.networks.includes(code as SocialNetworkCode)} />
                  <ListItemText primary={NETWORK_DISPLAY[code as keyof typeof NETWORK_DISPLAY]?.label ?? code} />
                </MenuItem>
              ))}
            </LabeledSelect>
          )}

          <Stack direction="row" gap={2}>
            <Box flex={1}>
              <LabeledField
                label="Desde"
                type="date"
                value={dateRange?.start ?? ''}
                onChange={(e) => setStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box flex={1}>
              <LabeledField
                label="Hasta"
                type="date"
                value={dateRange?.end ?? ''}
                onChange={(e) => setEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Stack>
        </Box>

        {SHOW_ADVANCED_FILTERS && (
          <Accordion
            disableGutters
            elevation={0}
            defaultExpanded={false}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, mt: 1, '&:before': { display: 'none' }, overflow: 'hidden' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={700}>Filtros avanzados</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <LabeledSelect
                label="Estado de publicación"
                multiple
                displayEmpty
                value={filters.status ?? []}
                onChange={handleStatusesChange}
                renderValue={(selected) =>
                  (selected as PostStatus[]).length > 0
                    ? (selected as PostStatus[]).map((s) => STATUS_LABELS[s]).join(', ')
                    : 'Todos los estados'
                }
              >
                {ALL_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Checkbox size="small" checked={(filters.status ?? []).includes(status)} />
                    <ListItemText primary={STATUS_LABELS[status]} />
                  </MenuItem>
                ))}
              </LabeledSelect>

              <Tooltip title="Disponible cuando se conecten los datos de equipo por publicación">
                <Box>
                  <LabeledSelect
                    label="Community Manager"
                    displayEmpty
                    disabled
                    value={filters.cmName ?? ''}
                    onChange={(e) => dispatch(setCmName((e.target.value as string) || null))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {MOCK_CM_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </LabeledSelect>
                </Box>
              </Tooltip>

              <Tooltip title="Disponible cuando se conecten los datos de equipo por publicación">
                <Box>
                  <LabeledSelect
                    label="Diseñador"
                    displayEmpty
                    disabled
                    value={filters.designerName ?? ''}
                    onChange={(e) => dispatch(setDesignerName((e.target.value as string) || null))}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {MOCK_DESIGNER_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </LabeledSelect>
                </Box>
              </Tooltip>

              <Tooltip title="Disponible cuando se conecte el catálogo de categorías a la métrica">
                <Box>
                  <LabeledSelect
                    label="Categoría"
                    displayEmpty
                    disabled
                    value={filters.category ?? ''}
                    onChange={(e) => dispatch(setCategory((e.target.value as string) || null))}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {MOCK_CATEGORY_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </LabeledSelect>
                </Box>
              </Tooltip>

              <Tooltip title="Disponible cuando se conecte el catálogo de especialidades a la métrica">
                <Box>
                  <LabeledSelect
                    label="Especialidad"
                    displayEmpty
                    disabled
                    value={filters.specialty ?? ''}
                    onChange={(e) => dispatch(setSpecialty((e.target.value as string) || null))}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {MOCK_SPECIALTY_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </LabeledSelect>
                </Box>
              </Tooltip>
            </AccordionDetails>
          </Accordion>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" gap={1.5}>
          <Button fullWidth variant="outlined" onClick={() => dispatch(clearAllFilters())} sx={{ color: 'primary.contrastTextMuted', borderColor: 'divider' }}>
            Limpiar filtros
          </Button>
          <PrimaryButton fullWidth onClick={onClose}>
            Ver resultados
          </PrimaryButton>
        </Stack>
      </Box>
    </Drawer>
  );
}
