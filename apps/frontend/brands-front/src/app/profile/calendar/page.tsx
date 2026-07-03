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
import MenuItem from '@mui/material/MenuItem';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import UpcomingOutlinedIcon from '@mui/icons-material/UpcomingOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import { Calendar, dateFnsLocalizer, type EventProps, type Messages } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { LabeledField, LabeledSelect, PostPreviewDialog, WidgetCard, STATUS_LABELS, STATUS_COLORS, usePermissions, selectUser } from '@repo/ui';
import {
  MOCK_CAMPAIGNS,
  MOCK_CALENDAR_EVENTS,
  AVAILABLE_SOCIAL_NETWORKS,
  getSocialAccount,
  getSocialAccountsByProfile,
  getCurrentClientProfile,
  type MockCampaignPost,
  type SocialNetworkCode,
} from '../../../lib/mock-data';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
});

const POSTS_FRONT_URL = 'http://localhost:3014';

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

interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  networkCode: SocialNetworkCode;
  networkColor: string;
  status: MockCampaignPost['status'];
  postId?: string;
}

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
  const connectedNetworks = useMemo(() => Array.from(new Set(socialAccounts.map((a) => a.socialNetwork))), [socialAccounts]);

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
      if (networkFilter && getSocialAccount(e.brandProfileId)?.socialNetwork !== networkFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (dateFrom && e.start.slice(0, 10) < dateFrom) return false;
      if (dateTo && e.start.slice(0, 10) > dateTo) return false;
      return true;
    });
  }, [events, campaignFilter, networkFilter, statusFilter, dateFrom, dateTo]);

  const calendarEvents = useMemo<CalendarEventItem[]>(
    () =>
      filteredEvents.map((e) => {
        const networkCode = getSocialAccount(e.brandProfileId)?.socialNetwork ?? 'IG';
        const networkColor = AVAILABLE_SOCIAL_NETWORKS.find((n) => n.code === networkCode)?.color ?? '#6B6B6B';
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
    ? AVAILABLE_SOCIAL_NETWORKS.find((n) => n.code === getSocialAccount(selectedEvent.brandProfileId)?.socialNetwork)?.label
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
            <WidgetCard icon={<UpcomingOutlinedIcon />} label="Próxima publicación" value={nextEventLabel} iconBg="#FFF8E1" iconColor="#7A5C00" />
          </Grid>
        </Grid>

        {/* Filtros — toolbar */}
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E8E8E8', borderRadius: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mb={2}>
            <Stack direction="row" alignItems="center" gap={1}>
              <FilterAltOutlinedIcon fontSize="small" sx={{ color: 'secondary.main' }} />
              <Typography variant="subtitle2" fontWeight={700}>Filtros</Typography>
            </Stack>
            {hasActiveFilters && (
              <Button size="small" onClick={handleClearFilters} sx={{ color: '#7A5C00' }}>
                Limpiar filtros
              </Button>
            )}
          </Stack>
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
                  <MenuItem key={code} value={code}>{code}</MenuItem>
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
        </Paper>

        {/* Leyenda de redes */}
        {connectedNetworks.length > 0 && (
          <Stack direction="row" gap={1} flexWrap="wrap" mb={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Redes:</Typography>
            {connectedNetworks.map((code) => {
              const color = AVAILABLE_SOCIAL_NETWORKS.find((n) => n.code === code)?.color ?? '#6B6B6B';
              return (
                <Chip
                  key={code}
                  size="small"
                  label={code}
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
            border: '1px solid #E8E8E8',
            borderRadius: 3,
            p: 2,
            height: 640,
            overflowX: 'auto',
            '& .rbc-calendar': { minWidth: 720, fontFamily: 'inherit' },
            '& .rbc-toolbar': { flexWrap: 'wrap', gap: 1, mb: 2 },
            '& .rbc-toolbar button': {
              borderRadius: 2,
              border: '1px solid #E8E8E8',
              color: '#1A1A1A',
              textTransform: 'none',
              fontWeight: 600,
            },
            '& .rbc-toolbar button:hover': { bgcolor: '#FFF8E1', borderColor: '#E0A800' },
            '& .rbc-toolbar button.rbc-active': { bgcolor: '#E0A800', color: '#7A5C00', borderColor: '#E0A800' },
            '& .rbc-toolbar-label': { fontWeight: 700, fontSize: 16 },
            '& .rbc-header': { py: 1, fontWeight: 700, fontSize: 12, borderColor: '#E8E8E8' },
            '& .rbc-month-view, & .rbc-time-view': { borderColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' },
            '& .rbc-day-bg + .rbc-day-bg, & .rbc-header + .rbc-header': { borderColor: '#F0F0F0' },
            '& .rbc-off-range-bg': { bgcolor: '#FAFAFA' },
            '& .rbc-today': { bgcolor: '#FFF8E1' },
            '& .rbc-event': {
              border: 'none',
              borderRadius: 1.5,
              padding: '2px 6px',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            },
            '& .rbc-event:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer' },
            '& .rbc-show-more': { color: '#7A5C00', fontWeight: 600 },
          }}
        >
          {calendarEvents.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} gap={1}>
              <EventAvailableOutlinedIcon sx={{ fontSize: 40, color: '#D0D0D0' }} />
              <Typography variant="body2" color="text.secondary">Sin publicaciones para estos filtros.</Typography>
            </Stack>
          ) : (
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              culture="es"
              messages={CALENDAR_MESSAGES}
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
        onViewFull={selectedEvent?.postId ? () => { window.location.href = `${POSTS_FRONT_URL}/posts/${selectedEvent.postId}`; } : undefined}
        onApprove={canReviewEvent && can('post', 'approve') ? handleApproveSelected : undefined}
        onReject={canReviewEvent && can('post', 'reject') ? handleRejectSelected : undefined}
      />
    </Box>
  );
}
