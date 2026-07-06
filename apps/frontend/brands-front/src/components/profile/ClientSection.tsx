'use client';

import { useState } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import { EmptyState, FormDialog, LabeledField, LabeledSelect, ScoreGauge, selectUser, PrimaryButton } from '@repo/ui';
import { CreateCampaignDialog } from '../CreateCampaignDialog';
import { CampaignCard } from '../campaigns/CampaignCard';
import {
  MOCK_CAMPAIGNS,
  MOCK_CATEGORIES,
  PROFILE_TYPE_LABELS,
  AVAILABLE_SOCIAL_NETWORKS,
  getSocialAccountsByProfile,
  getCurrentClientProfile,
  assignTeamToCampaign,
} from '../../lib/mock-data';
import type { MockCampaign, MockProfile, SocialAccount, SocialNetworkCode } from '../../lib/mock-data';

// Estructura de la sección Cliente en ProfilePage (§3 del rediseño de dominio).
// Placeholder: usa el primer MockProfile como "el Perfil del Cliente" porque hoy
// no existe una asociación real usuario↔perfil en los mocks — ninguna pantalla
// anterior la tenía tampoco (/brands se navega por id, no por "mi perfil").
// Vale para brand/company/organization/creator por igual: los 4 ProfileType
// del Cliente comparten esta misma sección (§A.1 — el tipo nunca bifurca flujo).
//
// Perfil, campañas y redes sociales usan estado local (useState) porque
// MOCK_PROFILES / MOCK_SOCIAL_ACCOUNTS son arrays en memoria sin reactividad
// propia — mismo patrón que ya usa app/brands/[id]/campaigns/page.tsx para
// altas de campaña. "Editar perfil" es, por lo mismo, solo de sesión: no
// muta MOCK_PROFILES, igual que "Agregar red social" no mutaba MOCK_SOCIAL_ACCOUNTS.
const POSTS_FRONT_URL = 'http://localhost:3014';

export function ClientSection() {
  const router = useRouter();
  const user = useSelector(selectUser);
  const [profile, setProfile] = useState<MockProfile>(() => getCurrentClientProfile(user?.email));

  const [campaigns, setCampaigns] = useState<MockCampaign[]>(() =>
    MOCK_CAMPAIGNS.filter((c) => c.brandId === profile.id),
  );
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(() =>
    getSocialAccountsByProfile(profile.id),
  );
  const [addNetworkOpen, setAddNetworkOpen] = useState(false);
  const [newNetworkCode, setNewNetworkCode] = useState<SocialNetworkCode | ''>('');
  const [newHandle, setNewHandle] = useState('');

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editCategory, setEditCategory] = useState(profile.category);

  const connectedCodes = socialAccounts.map((a) => a.socialNetwork);
  const availableNetworksToAdd = AVAILABLE_SOCIAL_NETWORKS.filter((n) => !connectedCodes.includes(n.code));

  // Una SocialAccount no se puede desconectar si alguna campaña activa la usa
  // (MockCampaign.socialAccountIds) — evita romper una campaña en curso.
  function isSocialAccountInActiveCampaign(socialAccountId: string): boolean {
    return campaigns.some((c) => c.status === 'active' && c.socialAccountIds.includes(socialAccountId));
  }

  function handleDisconnect(accountId: string) {
    if (isSocialAccountInActiveCampaign(accountId)) return;
    setSocialAccounts((prev) => prev.filter((a) => a.id !== accountId));
  }

  // Mock: no hay OAuth ni backend — solo agrega la cuenta al estado local.
  function handleAddNetwork() {
    if (!newNetworkCode || !newHandle.trim()) return;
    setSocialAccounts((prev) => [
      ...prev,
      { id: `bp-new-${Date.now()}`, brandId: profile.id, socialNetwork: newNetworkCode, handle: newHandle.trim(), followers: 0, active: true },
    ]);
    setNewNetworkCode('');
    setNewHandle('');
    setAddNetworkOpen(false);
  }

  function openEditProfile() {
    setEditName(profile.name);
    setEditCategory(profile.category);
    setEditProfileOpen(true);
  }

  // Mock: solo de sesión — no hay backend que persista el cambio.
  function handleEditProfile() {
    if (!editName.trim() || !editCategory) return;
    setProfile((prev) => ({ ...prev, name: editName.trim(), category: editCategory }));
    setEditProfileOpen(false);
  }

  const initials = profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Stack gap={3}>
      {/* Hero del perfil — identidad + score + acciones principales */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, background: 'linear-gradient(135deg, #FFFDF5 0%, #FFFFFF 60%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={3}>
          <Stack direction="row" gap={2} alignItems="center">
            <Avatar sx={{ width: 72, height: 72, bgcolor: profile.color, color: '#fff', fontSize: 26, fontWeight: 700 }}>
              {initials || '—'}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>{profile.name}</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" mt={0.75}>
                <Chip size="small" label={PROFILE_TYPE_LABELS[profile.type]} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} />
                <Chip size="small" label={profile.category} variant="outlined" />
              </Stack>
            </Box>
          </Stack>
          <Box sx={{ transform: 'scale(0.8)', transformOrigin: { xs: 'left', sm: 'center' } }}>
            <ScoreGauge score={profile.score.score} classification={profile.score.classification} />
          </Box>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" gap={1.5} flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={openEditProfile}
            sx={{ borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}>
            Editar perfil
          </Button>
          <Button size="small" variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} onClick={() => router.push('/profile/calendar')}
            sx={{ borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}>
            Ver calendario
          </Button>
          <Button size="small" variant="outlined" startIcon={<RateReviewOutlinedIcon />} onClick={() => { window.location.href = `${POSTS_FRONT_URL}/posts/approvals`; }}
            sx={{ borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}>
            Ver aprobaciones
          </Button>
        </Stack>
      </Paper>

      {/* Redes conectadas — cards */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>Redes conectadas</Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setAddNetworkOpen(true)}
            disabled={availableNetworksToAdd.length === 0}
            sx={{ borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}
          >
            + Agregar red social
          </Button>
        </Stack>
        {socialAccounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin cuentas conectadas todavía.</Typography>
        ) : (
          <Grid container spacing={2}>
            {socialAccounts.map((a) => {
              const locked = isSocialAccountInActiveCampaign(a.id);
              const netColor = AVAILABLE_SOCIAL_NETWORKS.find((n) => n.code === a.socialNetwork)?.color ?? '#6B6B6B';
              return (
                <Grid item xs={12} sm={6} md={4} key={a.id}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip size="small" label={a.socialNetwork} sx={{ bgcolor: `${netColor}18`, color: netColor, fontWeight: 700 }} />
                      {locked && (
                        <Tooltip title="En uso por una campaña activa">
                          <Chip size="small" label="En uso" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="body2" fontWeight={600} noWrap>{a.handle}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.followers.toLocaleString()} seguidores</Typography>
                    <Box mt={1.5}>
                      <Tooltip title={locked ? 'No se puede desconectar mientras una campaña activa la use' : ''}>
                        <span>
                          <Button size="small" disabled={locked} onClick={() => handleDisconnect(a.id)} sx={{ color: locked ? undefined : '#C62828', px: 0 }}>
                            Desconectar
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Campañas — cards clickeables */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>Campañas</Typography>
          <PrimaryButton
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => setCreateCampaignOpen(true)}
          >
            Crear nueva campaña
          </PrimaryButton>
        </Stack>
        {campaigns.length === 0 ? (
          <EmptyState
            title="Aún no tienes campañas"
            description="Crea tu primera campaña para empezar a coordinar contenido con tu equipo."
            action={
              <PrimaryButton onClick={() => setCreateCampaignOpen(true)}>
                Crear primera campaña
              </PrimaryButton>
            }
          />
        ) : (
          <Grid container spacing={2}>
            {campaigns.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <CampaignCard campaign={c} onClick={() => router.push(`/profile/campaigns/${c.id}`)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <CreateCampaignDialog
        open={createCampaignOpen}
        brandId={profile.id}
        brandCategory={profile.category}
        onClose={() => setCreateCampaignOpen(false)}
        onCreate={(campaign, team) => {
          assignTeamToCampaign(campaign.id, team);
          setCampaigns((prev) => [campaign, ...prev]);
        }}
      />

      <FormDialog
        open={addNetworkOpen}
        title="Agregar red social"
        maxWidth="xs"
        confirmLabel="Agregar"
        confirmDisabled={!newNetworkCode || !newHandle.trim()}
        onClose={() => setAddNetworkOpen(false)}
        onConfirm={handleAddNetwork}
      >
        <LabeledSelect
          label="Red social"
          value={newNetworkCode}
          onChange={(e) => setNewNetworkCode(e.target.value as SocialNetworkCode)}
          displayEmpty
        >
          <MenuItem value="" disabled><em>Selecciona una red</em></MenuItem>
          {availableNetworksToAdd.map((n) => (
            <MenuItem key={n.code} value={n.code}>{n.label}</MenuItem>
          ))}
        </LabeledSelect>
        <LabeledField
          label="Usuario / handle"
          placeholder="Ej. @tuempresa"
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value)}
          required
        />
      </FormDialog>

      <FormDialog
        open={editProfileOpen}
        title="Editar perfil"
        maxWidth="xs"
        confirmLabel="Guardar cambios"
        confirmDisabled={!editName.trim() || !editCategory}
        onClose={() => setEditProfileOpen(false)}
        onConfirm={handleEditProfile}
      >
        <LabeledField
          label="Nombre"
          placeholder="Nombre visible del perfil"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          required
        />
        <LabeledSelect
          label="Categoría"
          value={editCategory}
          onChange={(e) => setEditCategory(e.target.value as string)}
          displayEmpty
        >
          <MenuItem value="" disabled><em>Selecciona una categoría</em></MenuItem>
          {MOCK_CATEGORIES.map((cat) => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </LabeledSelect>
      </FormDialog>
    </Stack>
  );
}
