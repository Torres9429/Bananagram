'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { EmptyState, FormDialog, LabeledField, LabeledSelect, PrimaryButton, ConfirmDialog, ScoreGauge, useToast, usePermissions } from '@repo/ui/ui';
import { selectUser, useListCategoriesQuery } from '@repo/ui/state';
import { getInitials, formatDateRange } from '@repo/ui/utils';
import { ZONE_URLS } from '@repo/ui/config';
import { CreateCampaignDialog } from '../CreateCampaignDialog';
import { CreateBrandDialog } from '../CreateBrandDialog';
import { useUpdateBrandMutation, useCreateConnectUrlMutation, useUploadLogoMutation } from '../../store/api/brands.api';
import { useListCampaignsQuery } from '../../store/api/campaigns.api';
import { useGetBrandScoreQuery } from '../../store/api/metrics.api';
import {
  useListSocialAccountsQuery,
  useSyncSocialAccountsMutation,
  useDisconnectSocialAccountMutation,
  type SocialAccountWithNetwork,
} from '../../store/api/social-accounts.api';
import { useSelectedBrand } from '../../hooks/useSelectedBrand';
import { PROFILE_TYPE_LABELS, BRAND_TYPE_OPTIONS, CAMPAIGN_STATUS_LABEL } from '../../lib/mock-data';
import type { ProfileType } from '../../interfaces/interface';

// Colores por red solo para el Chip — el catálogo real (SocialNetwork) no
// trae color, es puramente visual y no vale la pena agregarlo al modelo.
const SOCIAL_NETWORK_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok: '#010101',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  x: '#000000',
  youtube: '#FF0000',
};

// Estructura de la sección Cliente en ProfilePage (§3 del rediseño de dominio).
// La "marca activa" viene de useSelectedBrand (Redux) — un Cliente puede
// tener varias marcas (GET /brands ya las devuelve todas, sin límite), el
// selector solo aparece si hay más de una. Vale para brand/company/
// organization/creator por igual: los 4 ProfileType del Cliente comparten
// esta misma sección (§A.1 — el tipo nunca bifurca flujo).
//
// Identidad del Hero (nombre/tipo/categoría/logo/color), redes sociales y
// campañas ya son datos reales. El score digital TAMBIÉN es real —
// GET brands/:id/score (ScoreController) existe desde hace tiempo y ya lo
// consume analytics-front (ScoreExplanationPanel), pero esta sección nunca
// lo llamaba: mostraba "Aún no disponible" hardcodeado pese a tener el
// permiso score:ver ya gateando el bloque (hallazgo real, reportado en vivo).
export function ClientSection() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const { can } = usePermissions();

  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [createBrandOpen, setCreateBrandOpen] = useState(false);
  // Un Cliente puede tener varias marcas (ej. Barcel) — useSelectedBrand
  // recuerda cuál está activa (Redux, persiste al navegar a
  // /profile/campaigns) en vez de tomar myBrands[0] a ciegas.
  const { myBrands, selectedBrand: realBrand, setSelectedBrandId } = useSelectedBrand();
  const realBrandId = realBrand?.id;
  const { data: categories = [] } = useListCategoriesQuery();
  const categoryName = categories.find((c) => c.id === realBrand?.categoryId)?.name;

  // Score real (GET brands/:id/score) — antes esta sección nunca lo pedía,
  // ver comentario arriba. skip también por permiso: el backend ya exige
  // score:ver (403 si no), esto solo evita la llamada innecesaria.
  const { data: score, isFetching: isLoadingScore } = useGetBrandScoreQuery(realBrandId ?? '', {
    skip: !realBrandId || !can('score', 'ver'),
  });

  const { data: allCampaigns = [] } = useListCampaignsQuery();
  const campaigns = realBrandId ? allCampaigns.filter((c) => c.brandId === realBrandId) : [];

  // Cuentas sociales reales, sincronizadas desde Ayrshare (ver plan "conectar
  // marca y cuenta de Instagram reales", Fase D).
  const { data: socialAccounts = [], isFetching: isLoadingSocialAccounts } = useListSocialAccountsQuery(
    realBrandId ?? '',
    { skip: !realBrandId },
  );
  const [syncSocialAccounts, { isLoading: isSyncing }] = useSyncSocialAccountsMutation();
  const [createConnectUrl] = useCreateConnectUrlMutation();
  const [disconnectSocialAccount, { isLoading: isDisconnecting }] = useDisconnectSocialAccountMutation();
  const { showSuccess, showError, showInfo } = useToast();

  async function handleSync() {
    if (!realBrandId) return;
    try {
      await syncSocialAccounts(realBrandId).unwrap();
      showSuccess('Cuentas sincronizadas con Ayrshare.');
    } catch {
      showError('No se pudo sincronizar con Ayrshare.');
    }
  }

  // Un solo hook de mutación (createConnectUrl) se dispara desde 2 botones
  // distintos ("Conectar otra red" arriba y "Reconectar" por card) — su
  // isLoading es uno solo para los dos, así que el loading por-botón se
  // trackea aparte con esta key ('top' | id de la cuenta) en vez de usarlo
  // directo, o ambos botones se prendían a la vez sin importar cuál se clickeó.
  const [connectingKey, setConnectingKey] = useState<string | null>(null);

  // Ayrshare no avisa cuando el usuario termina de conectar/reconectar en su
  // pestaña (no hay webhook sin plan Premium + URL pública, ver
  // syncFromAyrshare) — se detecta "volvió de la pestaña de Ayrshare" al
  // recuperar el foco de esta ventana y se sincroniza sola una vez, en vez
  // de dejar que el usuario tenga que acordarse de darle "Sincronizar".
  const awaitingSyncRef = useRef(false);

  useEffect(() => {
    function handleFocus() {
      if (awaitingSyncRef.current && realBrandId) {
        awaitingSyncRef.current = false;
        syncSocialAccounts(realBrandId);
      }
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [realBrandId, syncSocialAccounts]);

  function openConnectUrl(url: string) {
    awaitingSyncRef.current = true;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // El picker de red a conectar lo resuelve Ayrshare mismo dentro de su
  // propia página (connectUrl) — solo ofrece ahí las redes del catálogo que
  // la marca todavía no tiene conectadas, así que no hay que duplicar esa
  // lógica en un diálogo propio: basta con abrir el enlace.
  async function handleConnectAnotherNetwork() {
    if (!realBrandId) return;
    setConnectingKey('top');
    try {
      const result = await createConnectUrl({ id: realBrandId }).unwrap();
      openConnectUrl(result.connectUrl);
      showInfo('Se abrió una pestaña nueva para conectar en Ayrshare.');
    } catch {
      showError('No se pudo generar el enlace de conexión.');
    } finally {
      setConnectingKey(null);
    }
  }

  // Reconectar una cuenta inactiva: mismo connectUrl de Ayrshare pero
  // acotado a esa red puntual (allowedSocial: [code]) — la cuenta ya
  // desconectada de Ayrshare vuelve a aparecer ahí como conectable.
  async function handleReconnect(account: SocialAccountWithNetwork) {
    if (!realBrandId) return;
    setConnectingKey(account.id);
    try {
      const result = await createConnectUrl({ id: realBrandId, allowedSocial: [account.socialNetwork.code] }).unwrap();
      openConnectUrl(result.connectUrl);
      showInfo('Se abrió una pestaña nueva para reconectar en Ayrshare.');
    } catch {
      showError('No se pudo generar el enlace de conexión.');
    } finally {
      setConnectingKey(null);
    }
  }

  // Desconectar SÍ llama a Ayrshare de verdad (SocialAccountsService.
  // disconnect) — no borra el registro, lo marca active:false y sigue
  // viéndose en la lista con el chip "Inactiva".
  const [disconnectTarget, setDisconnectTarget] = useState<SocialAccountWithNetwork | null>(null);

  async function handleConfirmDisconnect() {
    if (!realBrandId || !disconnectTarget) return;
    try {
      await disconnectSocialAccount({ brandId: realBrandId, id: disconnectTarget.id }).unwrap();
      showSuccess(`${disconnectTarget.socialNetwork.name} desconectada.`);
    } catch {
      showError('No se pudo desconectar — Ayrshare rechazó la solicitud.');
    } finally {
      setDisconnectTarget(null);
    }
  }

  const [updateBrand, { isLoading: isSavingProfile }] = useUpdateBrandMutation();
  const [uploadLogo, { isLoading: isUploadingLogo }] = useUploadLogoMutation();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editProfileType, setEditProfileType] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  // Sube el logo de inmediato (mejor feedback), pero no lo persiste en
  // Brand.logoUrl todavía — eso pasa junto con el resto del formulario en
  // handleEditProfile, mismo patrón que StaffProfileSection con el avatar.
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !realBrandId) return;
    try {
      const { logoUrl } = await uploadLogo({ id: realBrandId, file }).unwrap();
      setEditLogoUrl(logoUrl);
      showSuccess('Logo listo — dale "Guardar cambios" para conservarlo.');
    } catch {
      showError('No se pudo subir el logo.');
    }
  }

  function openEditProfile() {
    if (!realBrand) return;
    setEditName(realBrand.name);
    setEditColor(realBrand.primaryColor ?? '');
    setEditProfileType(realBrand.profileType ?? '');
    setEditCategoryId(realBrand.categoryId ?? '');
    setEditLogoUrl(realBrand.logoUrl ?? '');
    setEditProfileOpen(true);
  }

  async function handleEditProfile() {
    if (!realBrandId || !editName.trim()) return;
    try {
      await updateBrand({
        id: realBrandId,
        body: {
          name: editName.trim(),
          primaryColor: editColor.trim() || undefined,
          profileType: editProfileType || undefined,
          categoryId: editCategoryId || undefined,
          logoUrl: editLogoUrl.trim() || undefined,
        },
      }).unwrap();
      setEditProfileOpen(false);
      showSuccess('Perfil actualizado.');
    } catch {
      showError('No se pudo guardar el perfil.');
    }
  }

  const displayName = realBrand?.name ?? user?.name ?? user?.email ?? 'Tu perfil';
  const displayColor = realBrand?.primaryColor ?? '#616161';
  const initials = getInitials(displayName).toUpperCase();

  // Guard defensivo: en la práctica hasProfileAccess (marcas:crear||editar,
  // ver /profile/page.tsx) ya garantiza marcas:ver — la cascada ver↔resto en
  // AdminRolesService.updateRolePermission activa 'ver' automáticamente al
  // conceder cualquier otra acción del módulo — pero esta sección entera
  // gira en torno a "ver marcas", así que se valida explícitamente en vez
  // de asumirlo. Va después de todos los hooks (Rules of Hooks), igual que
  // el guard de !user en /profile/page.tsx.
  if (!can('marcas', 'ver')) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <EmptyState title="No tienes permiso para ver esta sección" description="Contacta a un administrador si crees que esto es un error." />
      </Paper>
    );
  }

  return (
    <Stack gap={3}>
      {/* Un Cliente puede tener varias marcas (ej. Barcel) — el selector solo
          se muestra cuando ya hay más de una (no agrega ruido con una sola),
          pero el botón "Nueva marca" debe verse desde la primera marca: era
          el único punto de entrada para crear la SEGUNDA, y antes vivía
          dentro de este mismo bloque condicionado a length > 1 — con
          exactamente 1 marca (el caso común) nadie podía llegar a la
          segunda. Gateado por permiso, igual que el resto de acciones
          protegidas del sistema. */}
      {myBrands.length > 0 && (
        <Stack direction="row" gap={1.5} alignItems="center">
          {myBrands.length > 1 && (
            <Select
              size="small"
              value={realBrandId ?? ''}
              onChange={(e) => setSelectedBrandId(e.target.value as string)}
              sx={{ minWidth: 220, bgcolor: '#fff' }}
            >
              {myBrands.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          )}
          {can('marcas', 'crear') && (
            <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateBrandOpen(true)}>
              Nueva marca
            </Button>
          )}
        </Stack>
      )}

      {/* Hero del perfil — identidad + score + acciones principales */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, background: 'linear-gradient(135deg, #FFFDF5 0%, #FFFFFF 60%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={3}>
          <Stack direction="row" gap={2} alignItems="center">
            <Avatar src={realBrand?.logoUrl ?? undefined} sx={{ width: 72, height: 72, bgcolor: displayColor, color: '#fff', fontSize: 26, fontWeight: 700 }}>
              {initials || '—'}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>{displayName}</Typography>
              {realBrand && (
                <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                  <Chip size="small" label={PROFILE_TYPE_LABELS[realBrand.profileType as ProfileType] ?? realBrand.profileType ?? '—'} sx={{ bgcolor: 'primary.light', color: 'primary.contrastTextMuted', fontWeight: 600 }} />
                  {categoryName && <Chip size="small" label={categoryName} variant="outlined" />}
                </Stack>
              )}
            </Box>
          </Stack>
          {/* Score digital real (GET brands/:id/score) — antes placeholder
              hardcodeado pese a que el endpoint ya existía y funcionaba
              (analytics-front ya lo usa, ver ScoreExplanationPanel). */}
          {can('score', 'ver') && (
            <Box sx={{ textAlign: 'center', minWidth: 140 }}>
              {isLoadingScore && !score ? (
                <Skeleton variant="circular" width={90} height={90} sx={{ mx: 'auto' }} />
              ) : score ? (
                <ScoreGauge score={score.score} classification={score.classification} />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">Score Digital</Typography>
                  <Typography variant="caption" color="text.secondary">Aún no disponible</Typography>
                </>
              )}
            </Box>
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {can('marcas', 'editar') && (
            <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openEditProfile} disabled={!realBrand}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}>
              Editar perfil
            </Button>
          )}
          {can('campanas', 'ver') && (
            <Button size="small" variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} onClick={() => router.push('/profile/calendar')}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}>
              Ver calendario
            </Button>
          )}
          {can('publicaciones', 'ver') && (
            <Button size="small" variant="outlined" startIcon={<RateReviewOutlinedIcon />} onClick={() => { window.location.href = `${ZONE_URLS.postsFront}/posts/approvals`; }}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}>
              Ver aprobaciones
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Sin marca todavía: bloquea redes/campañas (ambos paneles ya
          deshabilitan sus acciones con !realBrandId) — este bloque es la
          salida real, no solo un botón deshabilitado sin explicación. */}
      {myBrands.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <EmptyState
            title="Aún no tienes una marca"
            description="Crea tu marca para conectar redes sociales reales y empezar a coordinar campañas."
            action={
              can('marcas', 'crear') ? (
                <PrimaryButton startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateBrandOpen(true)}>
                  Crear marca
                </PrimaryButton>
              ) : undefined
            }
          />
        </Paper>
      )}

      {/* Redes conectadas — datos reales, sincronizados desde Ayrshare.
          "Conectar otra red" abre la página de Ayrshare (ahí mismo se elige
          cuál del catálogo, ya filtrado a lo que falta conectar). "Sincronizar"
          trae lo que se haya conectado. "Desconectar" llama a Ayrshare de
          verdad y marca la cuenta inactiva (no la borra). */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>Redes conectadas</Typography>
          {can('marcas', 'editar') && (
            <Stack direction="row" gap={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<LinkOutlinedIcon />}
                onClick={handleConnectAnotherNetwork}
                disabled={!realBrandId || connectingKey === 'top'}
                sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
              >
                {connectingKey === 'top' ? 'Generando enlace…' : 'Conectar otra red'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SyncOutlinedIcon />}
                onClick={handleSync}
                disabled={!realBrandId || isSyncing}
                sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
              >
                {isSyncing ? 'Sincronizando…' : 'Sincronizar'}
              </Button>
            </Stack>
          )}
        </Stack>
        {isLoadingSocialAccounts ? (
          <Typography variant="body2" color="text.secondary">Cargando cuentas conectadas…</Typography>
        ) : socialAccounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Sin cuentas conectadas todavía. Conéctalas desde el enlace de Ayrshare y luego sincroniza.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {socialAccounts.map((a) => {
              const netColor = SOCIAL_NETWORK_COLORS[a.socialNetwork.code] ?? '#6B6B6B';
              return (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip size="small" label={a.socialNetwork.name} sx={{ bgcolor: `${netColor}18`, color: netColor, fontWeight: 700 }} />
                      {!a.active && (
                        <Chip size="small" label="Inactiva" sx={{ bgcolor: '#F5F5F5', color: '#757575', fontWeight: 600 }} />
                      )}
                    </Stack>
                    <Typography variant="body2" fontWeight={600} noWrap>{a.handle ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.followers.toLocaleString()} seguidores</Typography>
                    {can('marcas', 'editar') && (a.active ? (
                      <Box mt={1.5}>
                        <Button size="small" disabled={isDisconnecting} onClick={() => setDisconnectTarget(a)} sx={{ color: '#C62828', px: 0 }}>
                          Desconectar
                        </Button>
                      </Box>
                    ) : (
                      <Box mt={1.5}>
                        <Button
                          size="small"
                          startIcon={<LinkOutlinedIcon />}
                          disabled={connectingKey === a.id}
                          onClick={() => handleReconnect(a)}
                          sx={{ px: 0 }}
                        >
                          {connectingKey === a.id ? 'Generando enlace…' : 'Reconectar'}
                        </Button>
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Campañas — cards clickeables. Sección entera gateada por
          campanas:ver (no solo el botón de crear) — antes aparecía siempre
          que el usuario llegaba a /profile, sin importar si tenía permiso
          para ver campañas. */}
      {can('campanas', 'ver') && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>Campañas</Typography>
            {can('campanas', 'crear') && (
              <PrimaryButton
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setCreateCampaignOpen(true)}
                disabled={!realBrandId}
              >
                Crear nueva campaña
              </PrimaryButton>
            )}
          </Stack>
          {campaigns.length === 0 ? (
            <EmptyState
              title="Aún no tienes campañas"
              description="Crea tu primera campaña para empezar a coordinar contenido con tu equipo."
              action={
                can('campanas', 'crear') ? (
                  <PrimaryButton onClick={() => setCreateCampaignOpen(true)} disabled={!realBrandId}>
                    Crear primera campaña
                  </PrimaryButton>
                ) : undefined
              }
            />
          ) : (
            // Cards simples en vez de <CampaignCard> — ese componente asume
            // datos que el modelo real de Campaign no trae (postsCount, redes
            // sociales por campaña). Mismo estilo que profile/campaigns/page.tsx.
            <Stack gap={1.5}>
              {campaigns.map((c) => {
                const s = CAMPAIGN_STATUS_LABEL[c.status];
                return (
                  <Stack
                    key={c.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    onClick={() => router.push(`/brands/${c.brandId}/campaigns/${c.id}`)}
                    sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDateRange(c.startDate, c.endDate)}</Typography>
                    </Box>
                    <Stack direction="row" gap={1} alignItems="center">
                      {c.cmStatus === 'rechazada' && (
                        <Chip size="small" label="Rechazada por el CM" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 600 }} />
                      )}
                      <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600 }} />
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      {/* CreateCampaignDialog y la lista de campañas de arriba ya son reales
          (ver plan de integración) — el resto de esta sección (perfil, redes
          sociales) se queda mock, fuera de alcance de esta fase. Al crear,
          RTK Query invalida el cache de listCampaigns y la lista se actualiza sola. */}
      {realBrandId && (
        <CreateCampaignDialog
          open={createCampaignOpen}
          brandId={realBrandId}
          brandCategoryId={realBrand?.categoryId}
          onClose={() => setCreateCampaignOpen(false)}
        />
      )}

      <CreateBrandDialog open={createBrandOpen} onClose={() => setCreateBrandOpen(false)} />

      <FormDialog
        open={editProfileOpen}
        title="Editar perfil"
        maxWidth="xs"
        confirmLabel={isSavingProfile ? 'Guardando…' : 'Guardar cambios'}
        confirmDisabled={!editName.trim() || isSavingProfile}
        onClose={() => setEditProfileOpen(false)}
        onConfirm={handleEditProfile}
      >
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 2.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              src={editLogoUrl || undefined}
              sx={{ width: 56, height: 56, bgcolor: editColor || '#616161', color: '#fff', fontWeight: 700 }}
            >
              {getInitials(editName || 'M').toUpperCase()}
            </Avatar>
            <IconButton
              size="small"
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              aria-label="Cambiar logo"
              sx={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'primary.light' },
              }}
            >
              {isUploadingLogo ? <CircularProgress size={14} /> : <PhotoCameraOutlinedIcon fontSize="small" />}
            </IconButton>
            <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
          </Box>
          <Typography variant="caption" color="text.secondary">Logo de la marca</Typography>
        </Stack>
        <LabeledField
          label="Nombre"
          placeholder="Nombre visible del perfil"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          required
        />
        <LabeledSelect
          label="Tipo"
          value={editProfileType}
          onChange={(e) => setEditProfileType(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value=""><em>Sin especificar</em></MenuItem>
          {BRAND_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </LabeledSelect>
        <LabeledSelect
          label="Categoría (opcional)"
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value=""><em>Sin categoría</em></MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
          ))}
        </LabeledSelect>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 500, fontSize: 14 }}>
            Color primario (opcional)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
            Fondo del avatar mientras no haya logo — se ve reflejado arriba al elegirlo.
          </Typography>
          <Stack direction="row" gap={1} alignItems="center">
            <Box
              component="input"
              type="color"
              value={editColor || '#616161'}
              onChange={(e) => setEditColor((e.target as HTMLInputElement).value)}
              sx={{ width: 44, height: 44, p: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', bgcolor: 'transparent' }}
            />
            <TextField
              size="small"
              fullWidth
              placeholder="#E0A800"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>
      </FormDialog>

      <ConfirmDialog
        open={!!disconnectTarget}
        title="Desconectar red social"
        description={`¿Seguro que deseas desconectar ${disconnectTarget?.socialNetwork.name} (${disconnectTarget?.handle ?? 'sin usuario'})? Puedes volver a conectarla después desde "Conectar otra red".`}
        confirmLabel="Desconectar"
        destructive
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </Stack>
  );
}
