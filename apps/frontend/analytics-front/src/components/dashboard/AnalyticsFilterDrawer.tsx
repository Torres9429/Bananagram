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
import { LabeledSelect, LabeledField, STATUS_LABELS, PrimaryButton } from '@repo/ui';
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
import {
  selectAnalyticsFilters,
  selectProfileOptions,
  selectCampaignOptions,
  selectNetworkOptions,
} from '../../store/analytics.selectors';
import {
  MOCK_CATEGORY_OPTIONS,
  MOCK_CM_OPTIONS,
  MOCK_DESIGNER_OPTIONS,
  MOCK_SPECIALTY_OPTIONS,
} from '../../lib/analytics/filter-options';
import type { PostStatus, SocialNetworkCode } from '../../lib/analytics/types';
import { useDateRangeFilter } from './useDateRangeFilter';

const ALL_STATUSES: PostStatus[] = ['borrador', 'en_revision', 'aprobado', 'rechazado', 'programado', 'publicado'];

interface AnalyticsFilterDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Drawer lateral (desktop) / Bottom sheet (mobile) con el detalle completo de filtros.
 * Todos los controles despachan las mismas acciones de analyticsFilters.slice ya
 * usadas por AnalyticsFilterBar — no hay lógica de filtrado nueva aquí.
 */
export function AnalyticsFilterDrawer({ open, onClose }: AnalyticsFilterDrawerProps) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const filters = useSelector(selectAnalyticsFilters);
  const profileOptions = useSelector(selectProfileOptions);
  const networkOptions = useSelector(selectNetworkOptions);
  const campaignOptions = useSelector(selectCampaignOptions);
  const { dateRange, setStart, setEnd } = useDateRangeFilter();

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
          <LabeledSelect
            label="Perfil"
            displayEmpty
            value={filters.profileId ?? ''}
            onChange={(e) => dispatch(setProfile((e.target.value as string) || null))}
          >
            <MenuItem value="">Todos los perfiles</MenuItem>
            {profileOptions.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </LabeledSelect>

          <LabeledSelect
            label="Campaña"
            displayEmpty
            value={filters.campaignId ?? ''}
            onChange={(e) => dispatch(selectCampaign((e.target.value as string) || null))}
          >
            <MenuItem value="">Todas las campañas</MenuItem>
            {campaignOptions.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </LabeledSelect>

          <LabeledSelect
            label="Red social"
            multiple
            displayEmpty
            value={filters.networks}
            onChange={handleNetworksChange}
            renderValue={(selected) => ((selected as string[]).length > 0 ? (selected as string[]).join(', ') : 'Todas las redes')}
          >
            {networkOptions.map((code) => (
              <MenuItem key={code} value={code}>
                <Checkbox size="small" checked={filters.networks.includes(code)} />
                <ListItemText primary={code} />
              </MenuItem>
            ))}
          </LabeledSelect>

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

        <Accordion
          disableGutters
          elevation={0}
          defaultExpanded={false}
          sx={{ border: '1px solid #E8E8E8', borderRadius: 3, mt: 1, '&:before': { display: 'none' }, overflow: 'hidden' }}
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

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" gap={1.5}>
          <Button fullWidth variant="outlined" onClick={() => dispatch(clearAllFilters())} sx={{ color: '#7A5C00', borderColor: '#E8E8E8' }}>
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
