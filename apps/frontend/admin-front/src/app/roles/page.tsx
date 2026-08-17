'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import { useSelector } from 'react-redux';
import { EmptyState, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AdminTabs } from '../../components/AdminTabs';
import {
  useListRolesQuery,
  useListModulesQuery,
  useListActionsQuery,
  useUpdateRolePermissionMutation,
} from '../../store/api/admin.api';

// Editor de permisos real — cada Switch persiste al backend en el momento
// (PATCH /admin/roles/:id/permissions), no hay "Guardar cambios" en lote:
// el backend edita fila por fila la matriz role_permissions, no soporta un
// diff en batch, así que el estado local siempre refleja lo ya persistido
// (RTK Query invalida y refetch en cada toggle).
export default function RolesPage() {
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const { data: roles = [], isLoading: rolesLoading } = useListRolesQuery();
  const { data: modules = [] } = useListModulesQuery();
  const { data: actions = [] } = useListActionsQuery();
  const [updatePermission, { isLoading: isSaving }] = useUpdateRolePermissionMutation();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const activeRoleId = selectedRoleId || roles[0]?.id || '';
  const selectedRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [roles, activeRoleId]);

  if (!user) return null;

  if (!can('privilegios', 'ver')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <AdminTabs />
        <EmptyState title="No tienes permisos para gestionar roles" />
      </Box>
    );
  }

  function isGranted(moduleId: string, actionId: string) {
    return !!selectedRole?.permissions.some((p) => p.module.id === moduleId && p.action.id === actionId);
  }

  async function toggle(moduleSlug: string, actionSlug: string, moduleId: string, actionId: string) {
    if (!selectedRole || !can('privilegios', 'editar')) return;
    const key = `${moduleId}:${actionId}`;
    setPendingKey(key);
    try {
      await updatePermission({
        roleId: selectedRole.id,
        moduleSlug,
        actionSlug,
        allowed: !isGranted(moduleId, actionId),
      }).unwrap();
    } finally {
      setPendingKey(null);
    }
  }

  function countActive(roleId: string) {
    return roles.find((r) => r.id === roleId)?.permissions.length ?? 0;
  }
  function countModulesWithAccess(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return 0;
    return new Set(role.permissions.map((p) => p.module.id)).size;
  }
  function countModulesFullAccess(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return 0;
    return modules.filter((m) => actions.every((a) => role.permissions.some((p) => p.module.id === m.id && p.action.id === a.id))).length;
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={0.5}>Roles y privilegios</Typography>
            <Typography variant="body2" color="text.secondary">
              Cada cambio se guarda de inmediato en <code>role_permissions</code>.
            </Typography>
          </Box>
        </Stack>

        {/* Selector de rol */}
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', borderRadius: '12px 12px 0 0', px: 1 }}>
          <Tabs
            value={activeRoleId}
            onChange={(_, value) => setSelectedRoleId(value)}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ sx: { bgcolor: 'primary.main', height: 3 } }}
            sx={(theme) => ({ '& .Mui-selected': { color: `${theme.palette.primary.contrastTextMuted} !important`, fontWeight: 700 } })}
          >
            {roles.map((r) => (
              <Tab key={r.id} value={r.id} label={r.name} sx={{ textTransform: 'none', fontWeight: 600 }} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 3, mb: 3 }}>
          {rolesLoading || !selectedRole ? (
            <Typography variant="body2" color="text.secondary">Cargando roles…</Typography>
          ) : (
            <>
              {!can('privilegios', 'editar') && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  Puedes ver los privilegios de cada rol, pero no tienes permiso para editarlos.
                </Alert>
              )}

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <DoneAllIcon sx={{ color: 'primary.contrastTextMuted' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Privilegios activos</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{countActive(activeRoleId)} / {modules.length * actions.length}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <GridViewOutlinedIcon sx={{ color: '#1565C0' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Módulos con acceso</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{countModulesWithAccess(activeRoleId)} / {modules.length}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <PeopleOutlinedIcon sx={{ color: '#2E7D32' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Módulos con acceso total</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{countModulesFullAccess(activeRoleId)} / {modules.length}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              <Stack gap={1.25}>
                {modules.map((mod) => {
                  const grantedActions = actions.filter((a) => isGranted(mod.id, a.id));
                  return (
                    <Accordion
                      key={mod.id}
                      disableGutters
                      elevation={0}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 1 }} flexWrap="wrap" gap={1}>
                          <Typography variant="subtitle2" fontWeight={700}>{mod.name}</Typography>
                          <Chip
                            size="small"
                            label={`${grantedActions.length} de ${actions.length} activos`}
                            sx={{
                              bgcolor: grantedActions.length > 0 ? 'primary.light' : '#F5F5F5',
                              color: grantedActions.length > 0 ? 'primary.contrastTextMuted' : '#9E9E9E',
                              fontWeight: 600,
                            }}
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 2, pb: 2 }}>
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {actions.map((action) => {
                            const active = isGranted(mod.id, action.id);
                            const key = `${mod.id}:${action.id}`;
                            const disabled = !can('privilegios', 'editar') || (isSaving && pendingKey === key);
                            return (
                              <Stack
                                key={action.id}
                                direction="row"
                                alignItems="center"
                                gap={0.5}
                                onClick={() => !disabled && toggle(mod.slug, action.slug, mod.id, action.id)}
                                sx={{
                                  cursor: disabled ? 'default' : 'pointer',
                                  opacity: disabled && isSaving && pendingKey === key ? 0.5 : 1,
                                  px: 1, py: 0.25,
                                  borderWidth: 1,
                                  borderStyle: 'solid',
                                  borderColor: active ? 'primary.main' : 'divider',
                                  borderRadius: 1.5,
                                  bgcolor: active ? 'primary.light' : 'transparent',
                                  '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
                                }}
                              >
                                <Switch size="small" checked={active} disabled={disabled} onChange={() => {}} sx={{ width: 32, height: 20, p: 0, '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main', transform: 'translateX(12px)' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'primary.main' }, '& .MuiSwitch-thumb': { width: 14, height: 14 }, '& .MuiSwitch-track': { borderRadius: 10 } }} />
                                <Typography variant="caption" sx={{ color: active ? 'primary.contrastTextMuted' : '#6B6B6B', fontWeight: active ? 700 : 400, fontSize: 11 }}>
                                  {action.name}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
