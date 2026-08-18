'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useSelector } from 'react-redux';
import { EmptyState, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { formatRoleName } from '@repo/ui/utils';
import { AdminTabs } from '../../components/AdminTabs';
import { CreateRoleDialog } from '../../components/CreateRoleDialog';
import {
  useListRolesQuery,
  useListModulesQuery,
  useListActionsQuery,
  useUpdateRolePermissionMutation,
} from '../../store/api/admin.api';
import { VALID_MODULE_ACTIONS } from '../../lib/valid-module-actions';

// Tabla módulo×acción con checkboxes — reemplaza la versión de acordeones
// con Switch (pedido explícito del usuario: más fácil de escanear/probar
// como matriz). Cada checkbox persiste al instante (PATCH
// admin/roles/:id/permissions), no hay "Guardar cambios" en lote — el
// backend edita fila por fila. role.permissions[] ahora solo trae filas con
// allowed:true (bug real corregido en admin-roles.service.ts: antes traía
// TODAS las filas sin filtrar, así que un permiso recién apagado seguía
// contando como otorgado solo por existir la fila) — isGranted() vuelve a
// ser simplemente "¿existe en el array?", ya correcto.
//
// La tabla YA NO es el cartesiano completo módulo×acción (10×9=90) — solo
// se ofrecen las combinaciones con backing real de endpoint
// (VALID_MODULE_ACTIONS, ver ese archivo). Antes se podía marcar
// "Métricas → Eliminar" o "Reportes → Aprobar", que la BD guardaba sin
// problema pero ningún PermissionGuard consultaba jamás — falsa
// granularidad. Módulos sin ninguna combinación válida (ej. calendario, sin
// ningún endpoint que lo verifique) no aparecen como fila.
export default function RolesPage() {
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const { data: roles = [], isLoading: rolesLoading } = useListRolesQuery();
  const { data: allModules = [] } = useListModulesQuery();
  const { data: allActions = [] } = useListActionsQuery();
  const [updatePermission] = useUpdateRolePermissionMutation();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const activeRoleId = selectedRoleId || roles[0]?.id || '';
  const selectedRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [roles, activeRoleId]);

  // Módulos sin ninguna combinación válida no se muestran (ej. calendario).
  const modules = useMemo(
    () => allModules.filter((m) => (VALID_MODULE_ACTIONS[m.slug]?.length ?? 0) > 0),
    [allModules],
  );
  // Solo columnas de acciones que son válidas para al menos un módulo
  // visible — evita una columna íntegra de guiones (ej. "configurar", que
  // no tiene backing en ningún módulo).
  const actions = useMemo(() => {
    const used = new Set(modules.flatMap((m) => VALID_MODULE_ACTIONS[m.slug] ?? []));
    return allActions.filter((a) => used.has(a.slug));
  }, [allActions, modules]);
  const isValidCombo = (moduleSlug: string, actionSlug: string) => (VALID_MODULE_ACTIONS[moduleSlug] ?? []).includes(actionSlug);

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
      await updatePermission({ roleId: selectedRole.id, moduleSlug, actionSlug, allowed: !isGranted(moduleId, actionId) }).unwrap();
    } finally {
      setPendingKey(null);
    }
  }

  // Los 3 contadores se calculan solo sobre combinaciones válidas — si un
  // rol tuviera de arrastre algún permiso fuera del universo válido (ej.
  // calendario, ya asignado en el seed antes de este cambio), no infla
  // estos números ni el denominador deja de coincidir con lo que la tabla
  // realmente muestra.
  const validGrantedPermissions = (selectedRole?.permissions ?? []).filter((p) => isValidCombo(p.module.slug, p.action.slug));
  const countActive = validGrantedPermissions.length;
  const countTotal = modules.reduce((sum, m) => sum + (VALID_MODULE_ACTIONS[m.slug]?.length ?? 0), 0);
  const countModulesWithAccess = new Set(validGrantedPermissions.map((p) => p.module.id)).size;
  const countModulesFullAccess = modules.filter((m) => {
    const grantedSlugsForModule = new Set(validGrantedPermissions.filter((p) => p.module.id === m.id).map((p) => p.action.slug));
    return (VALID_MODULE_ACTIONS[m.slug] ?? []).every((actionSlug) => grantedSlugsForModule.has(actionSlug));
  }).length;

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={0.5}>Roles y privilegios</Typography>
            <Typography variant="body2" color="text.secondary">
              Cada casilla se guarda de inmediato en <code>role_permissions</code>.
            </Typography>
          </Box>
          {can('privilegios', 'crear') && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setCreateRoleOpen(true)}
            >
              Crear rol
            </Button>
          )}
        </Stack>

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
              <Tab key={r.id} value={r.id} label={formatRoleName(r.name)} sx={{ textTransform: 'none', fontWeight: 600 }} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 3 }}>
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
                      <Typography variant="subtitle1" fontWeight={700}>{countActive} / {countTotal}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <GridViewOutlinedIcon sx={{ color: '#1565C0' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Módulos con acceso</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{countModulesWithAccess} / {modules.length}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Stack direction="row" gap={1.5} alignItems="center" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <PeopleOutlinedIcon sx={{ color: '#2E7D32' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Módulos con acceso total</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{countModulesFullAccess} / {modules.length}</Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>

              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#FAFAFA' }}>Módulo</TableCell>
                      {actions.map((a) => (
                        <TableCell key={a.id} align="center" sx={{ fontWeight: 700, bgcolor: '#FAFAFA' }}>
                          {a.slug === 'ver' ? (
                            <Stack direction="row" alignItems="center" justifyContent="center" gap={0.25}>
                              {a.name}
                              <Tooltip title="Se activa sola al conceder cualquier otra acción de este módulo (editar, crear, exportar, etc.). Al desactivarla, se desactivan las demás acciones ya concedidas de ese módulo.">
                                <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                              </Tooltip>
                            </Stack>
                          ) : (
                            a.name
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modules.map((mod) => (
                      <TableRow key={mod.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{mod.name}</TableCell>
                        {actions.map((action) => {
                          // Combinación sin backing real (ej. Métricas →
                          // Eliminar) — ni checkbox ni posibilidad de
                          // asignarla, solo un guion. No existe ningún
                          // @RequirePermission que la vaya a consultar.
                          if (!isValidCombo(mod.slug, action.slug)) {
                            return (
                              <TableCell key={action.id} align="center">
                                <Typography variant="body2" sx={{ color: '#D0D0D0' }}>—</Typography>
                              </TableCell>
                            );
                          }
                          const key = `${mod.id}:${action.id}`;
                          const checked = isGranted(mod.id, action.id);
                          const disabled = !can('privilegios', 'editar') || pendingKey === key;
                          return (
                            <TableCell key={action.id} align="center">
                              <Tooltip title={`${mod.name} · ${action.name}`}>
                                <span>
                                  <Checkbox
                                    size="small"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => toggle(mod.slug, action.slug, mod.id, action.id)}
                                    sx={{ color: 'divider', '&.Mui-checked': { color: 'primary.main' } }}
                                  />
                                </span>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <CreateRoleDialog
        open={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        onCreated={(roleId) => setSelectedRoleId(roleId)}
      />
    </Box>
  );
}
