'use client';

import { useMemo, useState } from 'react';
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
import { LabeledField, LabeledSelect, PostPreviewDialog, FormDialog, STATUS_LABELS, STATUS_COLORS, usePermissions, useToast } from '@repo/ui/ui';
import type { PostStatus } from '@repo/ui/types';
import { useSelectedBrand } from '../../../hooks/useSelectedBrand';
import { useListCampaignsQuery } from '../../../store/api/campaigns.api';
import { useListPostsByBrandQuery, useApprovePostMutation, useRejectPostMutation, type PostListItem } from '../../../store/api/posts.api';

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

// Colores por red solo para el calendario/Chips — el catálogo real
// (SocialNetwork) no trae color, es puramente visual (mismo criterio ya
// usado en profile/page.tsx, no vale la pena agregarlo al modelo).
const NETWORK_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok: '#010101',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  x: '#000000',
  youtube: '#FF0000',
};

// Un evento por combinación (post × red objetivo) — un Post puede tener
// fan-out a varias redes (PostSocialAccount), esto mantiene el mismo nivel
// de granularidad que tenía la versión mock (un punto de color por red).
interface CalendarEventItem {
  key: string;
  postId: string;
  title: string;
  start: Date;
  end: Date;
  networkCode: string;
  networkColor: string;
  networkLabel: string;
  status: PostStatus;
  campaignId: string;
  campaignName: string;
}

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

const ALL_STATUSES: PostStatus[] = [
  'borrador', 'en_revision', 'rechazado', 'aprobado', 'rechazado_cliente',
  'programado', 'publicando', 'publicado', 'parcial', 'error', 'cancelado',
];

// Calendario del Cliente en /profile — conectado a publicaciones reales
// (antes 100% mock). Respeta la marca activa (useSelectedBrand) y aprobar/
// rechazar ejecuta la mutación real, igual que en posts-front/posts/approvals.
export default function ProfileCalendarPage() {
  const { can } = usePermissions();
  const { showSuccess, showError } = useToast();
  const { selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id;

  const { data: allCampaigns = [] } = useListCampaignsQuery();
  const campaigns = useMemo(() => allCampaigns.filter((c) => c.brandId === brandId), [allCampaigns, brandId]);

  const { data: posts = [] } = useListPostsByBrandQuery(brandId ?? '', { skip: !brandId });
  const [approvePost] = useApprovePostMutation();
  const [rejectPost] = useRejectPostMutation();

  const [campaignFilter, setCampaignFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

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

  // Un CalendarEventItem por (post × red social objetivo). start/end: los
  // posts no son un rango, así que ambos apuntan a scheduledAt (o
  // publishedAt si ya se publicó y nunca tuvo fecha programada).
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const items: CalendarEventItem[] = [];
    for (const post of posts) {
      const when = post.scheduledAt ?? post.publishedAt;
      if (!when) continue;
      const campaignName = post.campaign?.name ?? 'Sin campaña';
      const networks = post.socialNetworks.length > 0 ? post.socialNetworks : [];
      for (const { socialNetwork } of networks) {
        items.push({
          key: `${post.id}:${socialNetwork.id}`,
          postId: post.id,
          title: `${campaignName} · ${post.content.split('\n')[0]?.slice(0, 40) || 'Sin contenido'}`,
          start: new Date(when),
          end: new Date(when),
          networkCode: socialNetwork.code,
          networkColor: NETWORK_COLORS[socialNetwork.code] ?? '#6B6B6B',
          networkLabel: socialNetwork.name,
          status: post.status,
          campaignId: post.campaignId,
          campaignName,
        });
      }
    }
    return items;
  }, [posts]);

  const connectedNetworks = useMemo(
    () => Array.from(new Map(allEvents.map((e) => [e.networkCode, e])).values()),
    [allEvents],
  );

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      if (campaignFilter && e.campaignId !== campaignFilter) return false;
      if (networkFilter && e.networkCode !== networkFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      const day = format(e.start, 'yyyy-MM-dd');
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [allEvents, campaignFilter, networkFilter, statusFilter, dateFrom, dateTo]);

  function handleSelectEvent(event: CalendarEventItem) {
    setSelectedKey(event.key);
  }

  const selectedEvent = allEvents.find((e) => e.key === selectedKey) ?? null;
  const selectedScheduledAt = selectedEvent
    ? selectedEvent.start.toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : undefined;
  const canReviewEvent = selectedEvent?.status === 'en_revision';

  async function handleApproveSelected() {
    if (!selectedEvent) return;
    try {
      await approvePost(selectedEvent.postId).unwrap();
      showSuccess('Publicación aprobada.');
    } catch {
      showError('No se pudo aprobar la publicación.');
    } finally {
      setSelectedKey(null);
    }
  }

  async function handleConfirmReject() {
    if (!selectedEvent || !rejectComment.trim()) return;
    try {
      await rejectPost({ id: selectedEvent.postId, comment: rejectComment.trim() }).unwrap();
      showSuccess('Publicación rechazada.');
    } catch {
      showError('No se pudo rechazar la publicación.');
    } finally {
      setRejectOpen(false);
      setRejectComment('');
      setSelectedKey(null);
    }
  }

  const programmedCount = allEvents.filter((e) => e.status === 'programado').length;
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'active').length;
  const networksUsedCount = connectedNetworks.length;
  const nextEvent = [...allEvents]
    .filter((e) => e.start.getTime() >= Date.now())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const nextEventLabel = nextEvent
    ? nextEvent.start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Sin próximas';

  if (!brandId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">Selecciona una marca para ver su calendario.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <Box sx={{ p: 3 }}>
        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{ bgcolor: '#FFF3E0', color: '#E65100', borderRadius: 2, p: 1, display: 'flex' }}><EventAvailableOutlinedIcon /></Box>
              <Box><Typography variant="caption" color="text.secondary">Publicaciones programadas</Typography><Typography variant="subtitle1" fontWeight={700}>{programmedCount}</Typography></Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', borderRadius: 2, p: 1, display: 'flex' }}><CampaignOutlinedIcon /></Box>
              <Box><Typography variant="caption" color="text.secondary">Campañas activas</Typography><Typography variant="subtitle1" fontWeight={700}>{activeCampaignsCount}</Typography></Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{ bgcolor: '#E3F2FD', color: '#1565C0', borderRadius: 2, p: 1, display: 'flex' }}><ShareOutlinedIcon /></Box>
              <Box><Typography variant="caption" color="text.secondary">Redes usadas</Typography><Typography variant="subtitle1" fontWeight={700}>{networksUsedCount}</Typography></Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', borderRadius: 2, p: 1, display: 'flex' }}><UpcomingOutlinedIcon /></Box>
              <Box><Typography variant="caption" color="text.secondary">Próxima publicación</Typography><Typography variant="subtitle1" fontWeight={700}>{nextEventLabel}</Typography></Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Filtros */}
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
                <Button size="small" onClick={(e) => { e.stopPropagation(); handleClearFilters(); }} sx={{ color: 'primary.contrastTextMuted' }}>
                  Limpiar filtros
                </Button>
              )}
              <IconButton size="small" aria-label={filtersOpen ? 'Contraer filtros' : 'Expandir filtros'} sx={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          <Collapse in={filtersOpen}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <LabeledSelect label="Campaña" displayEmpty value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value as string)}>
                  <MenuItem value="">Todas las campañas</MenuItem>
                  {campaigns.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
                </LabeledSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <LabeledSelect label="Red social" displayEmpty value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value as string)}>
                  <MenuItem value="">Todas las redes</MenuItem>
                  {connectedNetworks.map((n) => (<MenuItem key={n.networkCode} value={n.networkCode}>{n.networkLabel}</MenuItem>))}
                </LabeledSelect>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <LabeledSelect label="Estado" displayEmpty value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PostStatus | '')}>
                  <MenuItem value="">Todos</MenuItem>
                  {ALL_STATUSES.map((s) => (<MenuItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</MenuItem>))}
                </LabeledSelect>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <LabeledField type="date" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <LabeledField type="date" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>
          </Collapse>
        </Paper>

        {/* Leyenda de redes */}
        {connectedNetworks.length > 0 && (
          <Stack direction="row" gap={1} flexWrap="wrap" mb={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Redes:</Typography>
            {connectedNetworks.map((n) => (
              <Chip key={n.networkCode} size="small" label={n.networkLabel} sx={{ bgcolor: `${n.networkColor}18`, color: n.networkColor, fontWeight: 700, height: 22, fontSize: 11 }} />
            ))}
          </Stack>
        )}

        {/* Calendario */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, height: 640,
            display: 'flex', flexDirection: 'column',
            '& .rbc-calendar': { fontFamily: 'inherit' },
            '& .rbc-header': { py: 1, fontWeight: 700, fontSize: 12, borderColor: 'divider' },
            '& .rbc-month-view, & .rbc-time-view, & .rbc-agenda-view': { borderColor: 'divider', borderRadius: 2 },
            '& .rbc-day-bg + .rbc-day-bg, & .rbc-header + .rbc-header': { borderColor: '#F0F0F0' },
            '& .rbc-off-range-bg': { bgcolor: '#FAFAFA' },
            '& .rbc-today': { bgcolor: 'primary.light' },
            '& .rbc-event': { border: 'none', borderRadius: 1.5, padding: '2px 6px', transition: 'transform 0.1s ease, box-shadow 0.1s ease' },
            '& .rbc-event:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer' },
            '& .rbc-show-more': { color: 'primary.contrastTextMuted', fontWeight: 600 },
          }}
        >
          <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ flexShrink: 0, mb: 2 }}>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {([{ action: 'TODAY' as const, label: 'Hoy' }, { action: 'PREV' as const, label: 'Anterior' }, { action: 'NEXT' as const, label: 'Siguiente' }]).map((b) => (
                <Button key={b.action} size="small" variant="outlined" onClick={() => handleCalendarNavigate(b.action)} sx={{ borderRadius: 2, borderColor: 'divider', color: '#1A1A1A', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' } }}>
                  {b.label}
                </Button>
              ))}
            </Stack>
            <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>{calendarLabel}</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {([{ view: 'month' as View, label: 'Mes' }, { view: 'week' as View, label: 'Semana' }, { view: 'day' as View, label: 'Día' }, { view: 'agenda' as View, label: 'Agenda' }]).map((v) => (
                <Button key={v.view} size="small" variant={calView === v.view ? 'contained' : 'outlined'} onClick={() => setCalView(v.view)} sx={calView === v.view ? { borderRadius: 2, textTransform: 'none', fontWeight: 600 } : { borderRadius: 2, borderColor: 'divider', color: '#1A1A1A', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main' } }}>
                  {v.label}
                </Button>
              ))}
            </Stack>
          </Stack>

          {filteredEvents.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, minHeight: 0 }} gap={1}>
              <EventAvailableOutlinedIcon sx={{ fontSize: 40, color: '#D0D0D0' }} />
              <Typography variant="body2" color="text.secondary">Sin publicaciones para estos filtros.</Typography>
            </Stack>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, overflowX: 'auto' }}>
              <Box sx={{ minWidth: 720, height: '100%' }}>
                <Calendar
                  localizer={localizer}
                  events={filteredEvents}
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
                  eventPropGetter={(event) => ({ style: { backgroundColor: `${event.networkColor}E6`, color: '#fff', cursor: 'pointer' } })}
                />
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      <PostPreviewDialog
        open={!!selectedEvent}
        onClose={() => setSelectedKey(null)}
        title={selectedEvent?.title ?? ''}
        status={selectedEvent?.status}
        networkLabel={selectedEvent?.networkLabel}
        campaignName={selectedEvent?.campaignName}
        scheduledAt={selectedScheduledAt}
        onApprove={canReviewEvent && can('publicaciones', 'aprobar') ? handleApproveSelected : undefined}
        onReject={canReviewEvent && can('publicaciones', 'rechazar') ? () => setRejectOpen(true) : undefined}
      />

      <FormDialog
        open={rejectOpen}
        title="Rechazar publicación"
        confirmLabel="Rechazar"
        confirmDisabled={!rejectComment.trim()}
        onClose={() => { setRejectOpen(false); setRejectComment(''); }}
        onConfirm={handleConfirmReject}
      >
        <LabeledField
          label="Motivo del rechazo"
          placeholder="Explica qué debe corregirse…"
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          required
          multiline
          rows={3}
          autoFocus
        />
      </FormDialog>
    </Box>
  );
}
