'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { WidgetCard, PrimaryButton } from '@repo/ui';
import { MOCK_ADMIN_DASHBOARD } from '../../lib/mock-dashboard';

const ADMIN_FRONT_URL = 'http://localhost:3010';

function nav(path: string) {
  window.location.href = `${ADMIN_FRONT_URL}${path}`;
}

export function DashboardAdmin() {
  const { users, catalogs, recentAudit } = MOCK_ADMIN_DASHBOARD;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Panel de administración</Typography>
          <Typography variant="body2" color="text.secondary">
            Vista general del sistema — {users.total} usuarios registrados
          </Typography>
        </Box>
        <PrimaryButton
          startIcon={<PersonAddOutlinedIcon />}
          onClick={() => nav('/users')}
        >
          Crear usuario
        </PrimaryButton>
      </Stack>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WidgetCard icon={<PeopleOutlinedIcon />} label="Usuarios activos" value={users.active} />
        <WidgetCard icon={<PersonAddOutlinedIcon />} label="Pendientes de activación" value={users.pendingActivation} iconBg="#FFF3E0" iconColor="#E65100" />
        <WidgetCard icon={<CategoryOutlinedIcon />} label="Catálogos configurados" value={catalogs.socialNetworks + catalogs.categories + catalogs.specialties} />
        <WidgetCard icon={<AdminPanelSettingsOutlinedIcon />} label="Roles del sistema" value={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Usuarios por rol</Typography>
              <Typography variant="body2" onClick={() => nav('/users')} sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>
                Ver todos →
              </Typography>
            </Stack>
            <Stack gap={1.5}>
              {users.byRole.map((r) => (
                <Stack key={r.role} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" gap={1} alignItems="center">
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#FFF8E1', color: '#7A5C00', fontSize: 11, fontWeight: 700 }}>
                      {r.role[0]}
                    </Avatar>
                    <Typography variant="body2">{r.role}</Typography>
                  </Stack>
                  <Chip size="small" label={r.count} sx={{ bgcolor: '#F5F5F5', fontWeight: 700 }} />
                </Stack>
              ))}
            </Stack>
          </Paper>
        </div>

        <div className="lg:col-span-7">
          <Stack gap={3}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>Accesos rápidos</Typography>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Usuarios', path: '/users', icon: <PeopleOutlinedIcon fontSize="small" /> },
                  { label: 'Roles y privilegios', path: '/roles', icon: <AdminPanelSettingsOutlinedIcon fontSize="small" /> },
                  { label: 'Catálogos', path: '/catalogs/categories', icon: <CategoryOutlinedIcon fontSize="small" /> },
                  { label: 'Auditoría', path: '/audit-log', icon: <HistoryOutlinedIcon fontSize="small" /> },
                ].map((item) => (
                  <Button
                    key={item.label}
                    variant="outlined"
                    startIcon={item.icon}
                    onClick={() => nav(item.path)}
                    sx={{ justifyContent: 'flex-start', borderColor: '#E8E8E8', color: '#3D3D3D', '&:hover': { borderColor: '#E0A800', color: '#7A5C00' } }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>Actividad reciente</Typography>
                <Typography variant="body2" onClick={() => nav('/audit-log')} sx={{ color: '#7A5C00', fontWeight: 600, cursor: 'pointer' }}>
                  Ver log completo →
                </Typography>
              </Stack>
              <Stack gap={1.5}>
                {recentAudit.map((entry) => (
                  <Stack key={entry.id} direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{entry.actor}</Typography>
                      <Typography variant="caption" color="text.secondary">{entry.action}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                      {entry.date}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </div>
      </div>
    </Box>
  );
}
