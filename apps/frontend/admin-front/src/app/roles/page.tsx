'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import { useSelector } from 'react-redux';
import { EmptyState, ConfirmDialog, WidgetCard, usePermissions, PrimaryButton } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AdminTabs } from '../../components/AdminTabs';
import { MODULES, ACTIONS, type PrivilegeMap, type Module, type Action } from '../../interfaces/interface';
import { ROLE_LABELS, ROLE_ORDER, DEFAULT_PRIVILEGES, ACTION_LABELS, MODULE_ACTIONS, MODULE_META } from '../../lib/mock-data';

function countActive(privs: PrivilegeMap): number {
  return MODULES.reduce((sum, m) => sum + privs[m].length, 0);
}
function countTotal(): number {
  return MODULES.reduce((sum, m) => sum + MODULE_ACTIONS[m].length, 0);
}
function countModulesWithAccess(privs: PrivilegeMap): number {
  return MODULES.filter((m) => privs[m].length > 0).length;
}
function countModulesFullAccess(privs: PrivilegeMap): number {
  return MODULES.filter((m) => privs[m].length === MODULE_ACTIONS[m].length).length;
}

export default function RolesPage() {
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const [privileges, setPrivileges] = useState<Record<string, PrivilegeMap>>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PRIVILEGES)),
  );
  const [selectedRole, setSelectedRole] = useState<string>('administrador');
  const [saved, setSaved] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  // Mientras la sesión aún no hidrata desde la cookie, `can()` siempre da
  // false (permissions arranca en {}) — sin este guard se veía un flash de
  // "No tienes permisos" aunque sí los tuviera. Mismo patrón que profile/page.tsx.
  if (!user) return null;

  if (!can('usuarios', 'ver')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <AdminTabs />
        <EmptyState title="No tienes permisos para gestionar roles" />
      </Box>
    );
  }

  const rolePrivs = privileges[selectedRole];

  function toggleAction(module: Module, action: Action) {
    setPrivileges((prev) => {
      const current = prev[selectedRole][module];
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [selectedRole]: { ...prev[selectedRole], [module]: updated } };
    });
    setSaved(false);
  }

  function setModuleActions(module: Module, actions: Action[]) {
    setPrivileges((prev) => ({ ...prev, [selectedRole]: { ...prev[selectedRole], [module]: actions } }));
    setSaved(false);
  }

  function handleRestore() {
    setPrivileges((prev) => ({ ...prev, [selectedRole]: JSON.parse(JSON.stringify(DEFAULT_PRIVILEGES[selectedRole])) }));
    setRestoreOpen(false);
    setSaved(false);
  }

  function handleSave() {
    // Mock: persiste solo en estado local.
    // Backend: PATCH /roles/privileges { roleKey, module, actions[] }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={0.5}>Roles y privilegios</Typography>
            <Typography variant="body2" color="text.secondary">
              Configuración visual (mock) — en producción se persiste en la tabla <code>role_permissions</code>.
            </Typography>
          </Box>
          <Stack direction="row" gap={1.5}>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => setRestoreOpen(true)}
              sx={{ borderColor: 'divider', color: 'secondary.main', '&:hover': { borderColor: 'primary.main' } }}
            >
              Restaurar rol
            </Button>
            <PrimaryButton onClick={handleSave}>
              Guardar cambios
            </PrimaryButton>
          </Stack>
        </Stack>

        {saved && (
          <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3, borderRadius: 2 }}>
            Privilegios de {ROLE_LABELS[selectedRole]} actualizados correctamente.
          </Alert>
        )}

        {/* Selector de rol */}
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff', borderRadius: '12px 12px 0 0', px: 1 }}>
          <Tabs
            value={selectedRole}
            onChange={(_, value) => setSelectedRole(value)}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ sx: { bgcolor: 'primary.main', height: 3 } }}
            sx={(theme) => ({ '& .Mui-selected': { color: `${theme.palette.primary.contrastTextMuted} !important`, fontWeight: 700 } })}
          >
            {ROLE_ORDER.map((roleKey) => (
              <Tab key={roleKey} value={roleKey} label={ROLE_LABELS[roleKey]} sx={{ textTransform: 'none', fontWeight: 600 }} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 3, mb: 3 }}>
          {/* Resumen del rol seleccionado */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <WidgetCard
                icon={<DoneAllIcon />}
                label="Privilegios activos"
                value={`${countActive(rolePrivs)} / ${countTotal()}`}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <WidgetCard
                icon={<GridViewOutlinedIcon />}
                label="Módulos con acceso"
                value={`${countModulesWithAccess(rolePrivs)} / ${MODULES.length}`}
                iconBg="#E3F2FD"
                iconColor="#1565C0"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <WidgetCard
                icon={<PeopleOutlinedIcon />}
                label="Módulos con acceso total"
                value={`${countModulesFullAccess(rolePrivs)} / ${MODULES.length}`}
                iconBg="#E8F5E9"
                iconColor="#2E7D32"
              />
            </Grid>
          </Grid>

          {/* Privilegios agrupados por módulo */}
          <Stack gap={1.25}>
            {MODULES.map((mod) => {
              const granted = rolePrivs[mod];
              const moduleActions = MODULE_ACTIONS[mod];
              const meta = MODULE_META[mod];
              return (
                <Accordion
                  key={mod}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px !important',
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 1 }} flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>{meta.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{meta.description}</Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`${granted.length} de ${moduleActions.length} activos`}
                        sx={{
                          bgcolor: granted.length > 0 ? 'primary.light' : '#F5F5F5',
                          color: granted.length > 0 ? 'primary.contrastTextMuted' : '#9E9E9E',
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pb: 2 }}>
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
                      {moduleActions.map((action) => {
                        const active = granted.includes(action);
                        return (
                          <Stack
                            key={action}
                            direction="row"
                            alignItems="center"
                            gap={0.5}
                            onClick={() => toggleAction(mod, action)}
                            sx={{
                              cursor: 'pointer',
                              px: 1, py: 0.25,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderColor: active ? 'primary.main' : 'divider',
                              borderRadius: 1.5,
                              bgcolor: active ? 'primary.light' : 'transparent',
                              '&:hover': { borderColor: 'primary.main' },
                            }}
                          >
                            <Switch
                              size="small"
                              checked={active}
                              onChange={() => {}}
                              sx={{
                                width: 32, height: 20, p: 0,
                                '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main', transform: 'translateX(12px)' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'primary.main' },
                                '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                '& .MuiSwitch-track': { borderRadius: 10 },
                              }}
                            />
                            <Typography variant="caption" sx={{ color: active ? 'primary.contrastTextMuted' : '#6B6B6B', fontWeight: active ? 700 : 400, fontSize: 11 }}>
                              {ACTION_LABELS[action]}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    <Stack direction="row" gap={1}>
                      <Button
                        size="small"
                        onClick={() => setModuleActions(mod, [...moduleActions])}
                        disabled={granted.length === moduleActions.length}
                        sx={{ color: 'secondary.main' }}
                      >
                        Activar todos
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setModuleActions(mod, [])}
                        disabled={granted.length === 0}
                        sx={{ color: '#6B6B6B' }}
                      >
                        Desactivar todos
                      </Button>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Box>
      </Box>

      <ConfirmDialog
        open={restoreOpen}
        title={`Restaurar permisos de ${ROLE_LABELS[selectedRole]}`}
        description="Se perderán los cambios locales de este rol y volverá a los privilegios por defecto. Esto no afecta a los demás roles."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        onConfirm={handleRestore}
        onCancel={() => setRestoreOpen(false)}
      />
    </Box>
  );
}
