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
import { EmptyState, ConfirmDialog, WidgetCard, usePermissions } from '@repo/ui';
import { AdminTabs } from '../../components/AdminTabs';

// Privilegios reales del sistema (AppModule × AppAction).
// Fuente de verdad: commons/src/types/modules.enum.ts + actions.enum.ts.
// El backend los persiste en role_permissions; aquí son solo mock de visualización/edición.
const MODULES = ['users', 'brands', 'catalogs', 'post', 'campaigns', 'metrics', 'score', 'reports'] as const;
const ACTIONS = ['manage', 'create', 'view', 'view-own', 'schedule', 'approve', 'reject', 'publish', 'export'] as const;

type Module = typeof MODULES[number];
type Action = typeof ACTIONS[number];
type PrivilegeMap = Record<Module, Action[]>;

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  community_manager: 'Community Manager',
  disenador: 'Diseñador',
  cliente: 'Cliente',
};
const ROLE_ORDER = ['administrador', 'cliente', 'community_manager', 'disenador'];

// Estado inicial de privilegios por rol (espeja mock-users.ts de commons).
const DEFAULT_PRIVILEGES: Record<string, PrivilegeMap> = {
  administrador: {
    users: ['manage'], brands: ['manage'], catalogs: ['manage'],
    post: ['create', 'schedule', 'approve', 'reject', 'publish'],
    campaigns: ['manage'], metrics: ['view'], score: ['view'], reports: ['export'],
  },
  community_manager: {
    users: [], brands: [], catalogs: [],
    post: ['create', 'schedule', 'publish'],
    campaigns: ['view-own'], metrics: ['view'], score: ['view'], reports: [],
  },
  disenador: {
    users: [], brands: [], catalogs: [],
    post: ['create'],
    campaigns: ['view-own'], metrics: [], score: [], reports: [],
  },
  cliente: {
    users: [], brands: [], catalogs: [],
    post: ['approve', 'reject'],
    campaigns: ['create'], metrics: ['view'], score: ['view'], reports: ['export'],
  },
};

const ACTION_LABELS: Record<Action, string> = {
  manage: 'Administrar', create: 'Crear', view: 'Ver', 'view-own': 'Ver propios',
  schedule: 'Programar', approve: 'Aprobar', reject: 'Rechazar', publish: 'Publicar', export: 'Exportar',
};

// Solo se ofrecen como switches las acciones que realmente se usan en algún rol
// para ese módulo (unión de DEFAULT_PRIVILEGES) — evita mostrar combinaciones
// sin sentido de dominio (ej. "Programar" bajo "Usuarios") y es lo que más
// reduce el amontonamiento de la pantalla anterior. No cambia qué puede
// otorgarse hoy: ningún rol tiene, en los mocks reales, una acción fuera de
// este conjunto.
const MODULE_ACTIONS: Record<Module, Action[]> = {
  users: ['manage'],
  brands: ['manage'],
  catalogs: ['manage'],
  post: ['create', 'schedule', 'approve', 'reject', 'publish'],
  campaigns: ['manage', 'create', 'view-own'],
  metrics: ['view'],
  score: ['view'],
  reports: ['export'],
};

const MODULE_META: Record<Module, { label: string; description: string }> = {
  users: { label: 'Usuarios', description: 'Alta, edición y activación de cuentas del sistema.' },
  brands: { label: 'Marcas', description: 'Catálogo de marcas/perfiles de cliente (legacy, ver /brands).' },
  catalogs: { label: 'Catálogos', description: 'Categorías, redes sociales y especialidades disponibles.' },
  post: { label: 'Publicaciones', description: 'Ciclo de vida de un post: crear, programar, aprobar, rechazar, publicar.' },
  campaigns: { label: 'Campañas', description: 'Creación y administración de campañas de contenido.' },
  metrics: { label: 'Métricas', description: 'Acceso a los paneles de analítica de redes sociales.' },
  score: { label: 'Score', description: 'Visualización del score digital de cada marca.' },
  reports: { label: 'Reportes', description: 'Exportación de reportes de desempeño.' },
};

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
  const [privileges, setPrivileges] = useState<Record<string, PrivilegeMap>>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PRIVILEGES)),
  );
  const [selectedRole, setSelectedRole] = useState<string>('administrador');
  const [saved, setSaved] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  if (!can('users', 'manage')) {
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
              sx={{ borderColor: '#E8E8E8', color: 'secondary.main', '&:hover': { borderColor: '#E0A800' } }}
            >
              Restaurar rol
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{ bgcolor: '#E0A800', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
            >
              Guardar cambios
            </Button>
          </Stack>
        </Stack>

        {saved && (
          <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3, borderRadius: 2 }}>
            Privilegios de {ROLE_LABELS[selectedRole]} actualizados correctamente.
          </Alert>
        )}

        {/* Selector de rol */}
        <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', borderRadius: '12px 12px 0 0', px: 1 }}>
          <Tabs
            value={selectedRole}
            onChange={(_, value) => setSelectedRole(value)}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ sx: { bgcolor: '#E0A800', height: 3 } }}
            sx={{ '& .Mui-selected': { color: '#7A5C00 !important', fontWeight: 700 } }}
          >
            {ROLE_ORDER.map((roleKey) => (
              <Tab key={roleKey} value={roleKey} label={ROLE_LABELS[roleKey]} sx={{ textTransform: 'none', fontWeight: 600 }} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ bgcolor: '#fff', border: '1px solid #E8E8E8', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 3, mb: 3 }}>
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
                    border: '1px solid #E8E8E8',
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
                          bgcolor: granted.length > 0 ? '#FFF8E1' : '#F5F5F5',
                          color: granted.length > 0 ? '#7A5C00' : '#9E9E9E',
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
                              border: `1px solid ${active ? '#E0A800' : '#E8E8E8'}`,
                              borderRadius: 1.5,
                              bgcolor: active ? '#FFF8E1' : 'transparent',
                              '&:hover': { borderColor: '#E0A800' },
                            }}
                          >
                            <Switch
                              size="small"
                              checked={active}
                              onChange={() => {}}
                              sx={{
                                width: 32, height: 20, p: 0,
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#E0A800', transform: 'translateX(12px)' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#E0A800' },
                                '& .MuiSwitch-thumb': { width: 14, height: 14 },
                                '& .MuiSwitch-track': { borderRadius: 10 },
                              }}
                            />
                            <Typography variant="caption" sx={{ color: active ? '#7A5C00' : '#6B6B6B', fontWeight: active ? 700 : 400, fontSize: 11 }}>
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
