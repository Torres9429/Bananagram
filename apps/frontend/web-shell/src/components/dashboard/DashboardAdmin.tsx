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
import { WidgetCard, PrimaryButton, EmptyState, usePermissions } from '@repo/ui/ui';
import { ZONE_URLS } from '@repo/ui/config';
import {
  useListUsersQuery,
  useListRolesQuery,
  useGetAuditLogQuery,
  useListCategoriesQuery,
  useListSpecialtiesQuery,
  useListSocialNetworksQuery,
} from '@repo/ui/state';
import { formatDate, formatRoleName } from '@repo/ui/utils';

function nav(path: string) {
  window.location.href = `${ZONE_URLS.adminFront}${path}`;
}

export function DashboardAdmin() {
  const { can } = usePermissions();
  const canUsers = can('usuarios', 'ver');
  const canRoles = can('privilegios', 'ver');
  const canCatalogs = can('catalogos', 'ver');

  const { data: users = [] } = useListUsersQuery(undefined, { skip: !canUsers });
  const { data: roles = [] } = useListRolesQuery(undefined, { skip: !canRoles });
  const { data: auditLog = [] } = useGetAuditLogQuery(10, { skip: !canUsers });
  const { data: categories = [] } = useListCategoriesQuery(undefined, { skip: !canCatalogs });
  const { data: specialties = [] } = useListSpecialtiesQuery(undefined, { skip: !canCatalogs });
  const { data: socialNetworks = [] } = useListSocialNetworksQuery(undefined, { skip: !canCatalogs });

  const active = users.filter((u) => u.status === 'active').length;
  const pendingActivation = users.filter((u) => u.status === 'pending').length;
  const byRole = Object.entries(
    users.reduce<Record<string, number>>((acc, u) => {
      for (const { role } of u.roles) acc[role.name] = (acc[role.name] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([role, count]) => ({ role, count }));

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100vh', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Panel de administración</Typography>
          <Typography variant="body2" color="text.secondary">
            Vista general del sistema{canUsers ? ` — ${users.length} usuarios registrados` : ''}
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
        <WidgetCard icon={<PeopleOutlinedIcon />} label="Usuarios activos" value={canUsers ? active : null} />
        <WidgetCard icon={<PersonAddOutlinedIcon />} label="Pendientes de activación" value={canUsers ? pendingActivation : null} iconBg="#FFF3E0" iconColor="#E65100" />
        <WidgetCard icon={<CategoryOutlinedIcon />} label="Catálogos configurados" value={canCatalogs ? categories.length + specialties.length + socialNetworks.length : null} />
        <WidgetCard icon={<AdminPanelSettingsOutlinedIcon />} label="Roles del sistema" value={canRoles ? roles.length : null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Usuarios por rol</Typography>
              <Typography variant="body2" onClick={() => nav('/users')} sx={{ color: 'primary.contrastTextMuted', fontWeight: 600, cursor: 'pointer' }}>
                Ver todos →
              </Typography>
            </Stack>
            {!canUsers ? (
              <EmptyState title="Sin permiso" description="No tienes permiso para ver usuarios (usuarios:ver)." />
            ) : (
              <Stack gap={1.5}>
                {byRole.map((r) => (
                  <Stack key={r.role} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" gap={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontSize: 11, fontWeight: 700 }}>
                        {formatRoleName(r.role)[0]}
                      </Avatar>
                      <Typography variant="body2">{formatRoleName(r.role)}</Typography>
                    </Stack>
                    <Chip size="small" label={r.count} sx={{ bgcolor: '#F5F5F5', fontWeight: 700 }} />
                  </Stack>
                ))}
              </Stack>
            )}
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
                    sx={{ justifyContent: 'flex-start', borderColor: '#E8E8E8', color: '#3D3D3D', '&:hover': { borderColor: '#E0A800', color: 'primary.contrastTextMuted' } }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1" fontWeight={700}>Actividad reciente</Typography>
                <Typography variant="body2" onClick={() => nav('/audit-log')} sx={{ color: 'primary.contrastTextMuted', fontWeight: 600, cursor: 'pointer' }}>
                  Ver log completo →
                </Typography>
              </Stack>
              {!canUsers ? (
                <EmptyState title="Sin permiso" description="No tienes permiso para ver la auditoría (usuarios:ver)." />
              ) : auditLog.length === 0 ? (
                <EmptyState title="Sin actividad reciente" description="Todavía no hay eventos registrados." />
              ) : (
                <Stack gap={1.5}>
                  {auditLog.map((entry) => (
                    <Stack key={entry.id} direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{entry.performedBy}</Typography>
                        <Typography variant="caption" color="text.secondary">{entry.action}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                        {formatDate(entry.createdAt)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </div>
      </div>
    </Box>
  );
}
