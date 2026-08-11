'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import UpcomingOutlinedIcon from '@mui/icons-material/UpcomingOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Calendar, dateFnsLocalizer, type EventProps, type Messages, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { LabeledField, LabeledSelect, PostPreviewDialog, WidgetCard, STATUS_LABELS, STATUS_COLORS, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { ZONE_URLS } from '@repo/ui/config';
import {
  MOCK_CAMPAIGNS,
  MOCK_CALENDAR_EVENTS,
  getSocialAccount,
  getSocialNetwork,
  getSocialAccountsByProfile,
  getCurrentClientProfile,
} from '../../../lib/mock-data';
import type { MockCampaignPost, SocialNetworkCode, CalendarEventItem } from '../../../interfaces/interface';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

// Textos de react-big-calendar en español — la librería viene en inglés por
// defecto (Today/Back/Next/Month/Week/Day/Agenda...); esto NO afecta el
// formato de fecha del calendario en sí, que ya usa el locale `es` de date-fns.
const CALENDAR_MESSAGES: Messages = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Publicación',
  noEventsInRange: 'No hay publicaciones en este rango.',
  showMore: (total: number) => `+${total} más`,
};

const ALL_STATUSES: MockCampaignPost['status'][] = ['borrador', 'en_revision', 'aprobado', 'rechazado', 'programado', 'publicado'];

// Fila del evento — reemplaza el título default de react-big-calendar por un
// punto de color (red) + título + acento de color por estado, sin librería nueva.
function EventRow({ event }: EventProps<CalendarEventItem>) {
  const statusColor = STATUS_COLORS[event.status]?.color ?? '#6B6B6B';
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ overflow: 'hidden' }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
      <Typography variant="caption" noWrap sx={{ fontSize: 11, fontWeight: 600, color: 'inherit' }}>
        {event.title}
      </Typography>
    </Stack>
  );
}

// Calendario del Cliente en /profile — mismo react-big-calendar que ya
// funcionaba (no se cambió a FullCalendar: no estaba instalado y
// react-big-calendar ya cubre lo pedido vía eventPropGetter/components,
// sin agregar una dependencia nueva), ahora con cards resumen, filtros en
// toolbar, leyenda de redes y estilos propios. SIN BrandTabs.
export default function ProfileCalendarPage() {
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const profile = getCurrentClientProfile(user?.email);

  const campaigns = useMemo(() => MOCK_CAMPAIGNS.filter((c) => c.brandId === profile.id), [profile.id]);
  const socialAccounts = useMemo(() => getSocialAccountsByProfile(profile.id), [profile.id]);
  const connectedNetworks = useMemo(() => Array.from(new Set(socialAccounts.map((a) => a.socialNetworkId))), [socialAccounts]);

  // Estado local (no MOCK_CALENDAR_EVENTS directo) para poder aprobar/rechazar
  // un evento puntual desde el modal — mismo patrón ya usado en
  // ClientSection.tsx/posts-front, aplicado aquí sin depender de posts-front.
  const [events, setEvents] = useState(() => MOCK_CALENDAR_EVENTS.filter((e) => e.brandId === profile.id));

  const [campaignFilter, setCampaignFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState<SocialNetworkCode | ''>('');
  const [statusFilter, setStatusFilter] = useState<MockCampaignPost['status'] | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Toolbar propia en vez de la default de react-big-calendar: la default
  // (.rbc-toolbar) vive DENTRO de .rbc-calendar, el mismo contenedor que
  // necesita minWidth+scroll horizontal para la grilla — eso obligaba a la
  // barra a estirarse al mismo ancho mínimo, dejando los botones de
  // Mes/Semana/Día fuera de la pantalla en mobile sin scrollear primero.
  // Con `toolbar={false}` + view/date controlados a mano, esta barra queda
  // completamente afuera de esa zona de scroll — visible entera siempre.
  const [calView, setCalView] = useState<View>('month');
  const [calDate, setCalDate] = useState(new Date());

  function handleCalendarNavigate(action: 'TODAY' | 'PREV' | 'NEXT') {
    if (action === 'TODAY') { setCalDate(new Date()); return; }
    const dir = action === 'NEXT' ? 1 : -1;
    setCalDate((prev) => {
      if (calView === 'week') return dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1);
      if (calView === 'day') return dir > 0 ? addDays(prev, 1) : subDays(prev, 1);
      return dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1);
    });
  }

  const calendarLabel = useMemo(() => {
    if (calView === 'week') {
      const start = startOfWeek(calDate, { locale: es });
      const end = endOfWeek(calDate, { locale: es });
      return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
    }
    if (calView === 'day') return format(calDate, "EEEE d 'de' MMMM", { locale: es });
    return format(calDate, 'MMMM yyyy', { locale: es });
  }, [calView, calDate]);

  const hasActiveFilters = !!(campaignFilter || networkFilter || statusFilter || dateFrom || dateTo);

  function handleClearFilters() {
    setCampaignFilter('');
    setNetworkFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  }

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (campaignFilter && e.campaignId !== campaignFilter) return false;
      if (networkFilter && getSocialAccount(e.socialAccountId)?.socialNetworkId !== networkFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (dateFrom && e.start.slice(0, 10) < dateFrom) return false;
      if (dateTo && e.start.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [events, campaignFilter, networkFilter, statusFilter, dateFrom, dateTo]);

  const calendarEvents = useMemo<CalendarEventItem[]>(
    () =>
      filteredEvents.map((e) => {
        const networkCode = (getSocialAccount(e.socialAccountId)?.socialNetworkId ?? 'instagram') as SocialNetworkCode;
        const networkColor = getSocialNetwork(networkCode)?.color ?? '#6B6B6B';
        return {
          id: e.id,
          title: e.title,
          start: new Date(e.start),
          end: new Date(e.end),
          networkCode,
          networkColor,
          status: e.status,
          postId: e.postId,
        };
      }),
    [filteredEvents],
  );

  // Clic en un evento: abre el modal de detalle rápido — nunca navega ni
  // cambia de ruta, con o sin postId (§1 del ajuste UX).
  function handleSelectEvent(event: CalendarEventItem) {
    setSelectedEventId(event.id);
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const selectedCampaign = selectedEvent ? campaigns.find((c) => c.id === selectedEvent.campaignId) ?? null : null;
  const selectedNetworkLabel = selectedEvent
    ? getSocialNetwork(getSocialAccount(selectedEvent.socialAccountId)?.socialNetworkId ?? '')?.label
    : undefined;
  const selectedScheduledAt = selectedEvent
    ? new Date(selectedEvent.start).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : undefined;
  // Aprobar/Rechazar solo cuando el estado (en_revision) Y el permiso lo
  // permiten — mismo criterio ya usado en posts-front/posts/approvals, mutando
  // aquí el estado local de este evento (no el de posts-front, no persiste).
  const canReviewEvent = selectedEvent?.status === 'en_revision';

  function handleApproveSelected() {
    if (!selectedEvent) return;
    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? { ...e, status: 'aprobado' } : e)));
    setSelectedEventId(null);
  }

  function handleRejectSelected() {
    if (!selectedEvent) return;
    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? { ...e, status: 'rechazado' } : e)));
    setSelectedEventId(null);
  }

  // Cards resumen — siempre sobre el perfil completo, no sobre los filtros
  // activos, para que sigan sirviendo como panorama general mientras se filtra.
  const programmedCount = events.filter((e) => e.status === 'programado').length;
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
  const networksUsedCount = connectedNetworks.length;
  const nextEvent = [...events]
    .filter((e) => new Date(e.start).getTime() >= Date.now())
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const nextEventLabel = nextEvent
    ? new Date(nextEvent.start).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Sin próximas';

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      {/* Sin header propio: el TopBar ya muestra "Calendario" y el Sidebar ya
          tiene el link a "Mi perfil" — no hace falta una franja blanca ni un
          botón de volver aparte. */}
      <Box sx={{ p: 3 }}>
        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <WidgetCard icon={<EventAvailableOutlinedIcon />} label="Publicaciones programadas" value={programmedCount} iconBg="#FFF3E0" iconColor="#E65100" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <WidgetCard icon={<CampaignOutlinedIcon />} label="Campañas activas" value={activeCampaignsCount} iconBg="#E8F5E9" iconColor="#2E7D32" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <WidgetCard icon={<ShareOutlinedIcon />} label="Redes usadas" value={networksUsedCount} iconBg="#E3F2FD" iconColor="#1565C0" />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <WidgetCard icon={<UpcomingOutlinedIcon />} label="Próxima publicación" value={nextEventLabel} iconBg="primary.light" iconColor="primary.contrastTextMuted" />
          </Grid>
        </Grid>

        {/* Filtros — toolbar, contraíble para liberar espacio vertical
            (sobre todo en mobile, donde 5 campos ocupan bastante). */}
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            mb={filtersOpen ? 2 : 0}
            onClick={() => setFiltersOpen((v) => !v)}
            sx={{ cursor: 'pointer' }}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <FilterAltOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
              <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
              {hasActiveFilters && !filtersOpen && (
                <Chip size="small" label="Activos" sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 600, height: 20, fontSize: 11 }} />
              )}
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.5}>
              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleClearFilters(); }}
                  sx={{ color: 'primary.contrastTextMuted' }}
                >
                  Limpiar filtros
                </Button>
              )}
              <IconButton
                size="small"
                aria-label={filtersOpen ? 'Contraer filtros' : 'Expandir filtros'}
                sx={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          <Collapse in={filtersOpen}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <LabeledSelect label="Campaña" displayEmpty value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value as string)}>
                <MenuItem value="">Todas las campañas</MenuItem>
                {campaigns.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </LabeledSelect>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LabeledSelect label="Red social" displayEmpty value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value as SocialNetworkCode | '')}>
                <MenuItem value="">Todas las redes</MenuItem>
                {connectedNetworks.map((code) => (
                  <MenuItem key={code} value={code}>{getSocialNetwork(code)?.label ?? code}</MenuItem>
                ))}
              </LabeledSelect>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <LabeledSelect label="Estado" displayEmpty value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MockCampaignPost['status'] | '')}>
                <MenuItem value="">Todos</MenuItem>
                {ALL_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
                ))}
              </LabeledSelect>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <LabeledField
                type="date"
                label="Desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <LabeledField
                type="date"
                label="Hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          </Collapse>
        </Paper>

        {/* Leyenda de redes */}
        {connectedNetworks.length > 0 && (
          <Stack direction="row" gap={1} flexWrap="wrap" mb={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Redes:</Typography>
            {connectedNetworks.map((code) => {
              const network = getSocialNetwork(code);
              const color = network?.color ?? '#6B6B6B';
              return (
                <Chip
                  key={code}
                  size="small"
                  label={network?.label ?? code}
                  sx={{ bgcolor: `${color}18`, color, fontWeight: 700, height: 22, fontSize: 11 }}
                />
              );
            })}
          </Stack>
        )}

        {/* Calendario */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: 2,
            height: 640,
            display: 'flex',
            flexDirection: 'column',
            '& .rbc-calendar': { fontFamily: 'inherit' },
            '& .rbc-header': { py: 1, fontWeight: 700, fontSize: 12, borderColor: 'divider' },
            '& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view': { borderColor: 'divider', borderRadius: 2 },
            '& .rbc-day-bg + .rbc-day-bg, & .rbc-header + .rbc-header': { borderColor: '#F0F0F0' },
            '& .rbc-off-range-bg': { bgcolor: '#FAFAFA' },
            '& .rbc-today': { bgcolor: 'primary.light' },
            '& .rbc-event': {
              border: 'none',
              borderRadius: 1.5,
              padding: '2px 6px',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            },
            '& .rbc-event:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer' },
            '& .rbc-show-more': { color: 'primary.contrastTextMuted', fontWeight: 600 },
          }}
        >
          {/* Toolbar propia — ver comentario en calView/handleCalendarNavigate
              arriba. flexShrink: 0 para que nunca se comprima cuando el
              calendario de abajo necesite su espacio. */}
          <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ flexShrink: 0, mb: 2 }}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {([
                { action: 'TODAY' as const, label: 'Hoy' },
                { action: 'PREV' as const, label: 'Anterior' },
                { action: 'NEXT' as const, label: 'Siguiente' },
              ]).map((b) => (
                <Button
                  key={b.action}
                  size="small"
                  variant="outlined"
                  onClick={() => handleCalendarNavigate(b.action)}
                  sx={{ borderRadius: 2, borderColor: 'divider', color: '#1A1A1A', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' } }}
                >
                  {b.label}
                </Button>
              ))}
            </Stack>

            <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{calendarLabel}</Typography>

            <Stack direction="row" gap={1} flexWrap="wrap">
              {([
                { view: 'month' as View, label: 'Mes' },
                { view: 'week' as View, label: 'Semana' },
                { view: 'day' as View, label: 'Día' },
                { view: 'agenda' as View, label: 'Agenda' },
              ]).map((v) => (
                <Button
                  key={v.view}
                  size="small"
                  variant={calView === v.view ? 'contained' : 'outlined'}
                  onClick={() => setCalView(v.view)}
                  sx={calView === v.view
                    ? { borderRadius: 2, textTransform: 'none', fontWeight: 600 }
                    : { borderRadius: 2, borderColor: 'divider', color: '#1A1A1A', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' } }}
                >
                  {v.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          {calendarEvents.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, minHeight: 0 }} gap={1}>
              <EventAvailableOutlinedIcon sx={{ fontSize: 40, color: '#D0D0D0' }} />
              <Typography variant="body2" color="text.secondary">Sin publicaciones para estos filtros.</Typography>
            </Stack>
          ) : (
            // La grilla (mes/semana/agenda) sí necesita un ancho mínimo legible
            // — a diferencia de la toolbar de arriba, esto SÍ scrollea
            // horizontal en mobile, pero ya no arrastra a la navegación con ella.
            <Box sx={{ flex: 1, minHeight: 0, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 720, height: '100%' }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  culture="es"
                  messages={CALENDAR_MESSAGES}
                  toolbar={false}
                  view={calView}
                  onView={setCalView}
                  date={calDate}
                  onNavigate={setCalDate}
                  components={{ event: EventRow }}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={(event) => ({
                    style: {
                      backgroundColor: `${event.networkColor}E6`,
                      color: '#fff',
                      cursor: 'pointer',
                    },
                  })}
                />
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <PostPreviewDialog
        open={!!selectedEvent}
        onClose={() => setSelectedEventId(null)}
        title={selectedEvent?.title ?? ''}
        status={selectedEvent?.status}
        networkLabel={selectedNetworkLabel}
        campaignName={selectedCampaign?.name ?? null}
        scheduledAt={selectedScheduledAt}
        onViewFull={selectedEvent?.postId ? () => { window.location.href = `${ZONE_URLS.postsFront}/posts/${selectedEvent.postId}`; } : undefined}
        onApprove={canReviewEvent && can('publicaciones', 'aprobar') ? handleApproveSelected : undefined}
        onReject={canReviewEvent && can('publicaciones', 'rechazar') ? handleRejectSelected : undefined}
      />
    </Box>
  );
}
