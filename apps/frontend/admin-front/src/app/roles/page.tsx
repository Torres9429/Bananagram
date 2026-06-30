'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { EmptyState, usePermissions } from '@repo/ui';
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

export default function RolesPage() {
  const { can } = usePermissions();
  const [privileges, setPrivileges] = useState<Record<string, PrivilegeMap>>(() =>
    JSON.parse(JSON.stringify(DEFAULT_PRIVILEGES)),
  );
  const [saved, setSaved] = useState(false);

  if (!can('users', 'manage')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <AdminTabs />
        <EmptyState title="No tienes permisos para gestionar roles" />
      </Box>
    );
  }

  function toggleAction(roleKey: string, module: Module, action: Action) {
    setPrivileges((prev) => {
      const current = prev[roleKey][module];
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [roleKey]: { ...prev[roleKey], [module]: updated } };
    });
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
              Los cambios aquí son visuales (mock). En producción se persisten en la tabla <code>role_permissions</code>.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: '#FDC726', color: '#7A5C00', '&:hover': { bgcolor: '#D4AC40' } }}
          >
            Guardar cambios
          </Button>
        </Stack>

        {saved && (
          <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 3, borderRadius: 2 }}>
            Privilegios actualizados correctamente.
          </Alert>
        )}

        <Grid container spacing={2}>
          {Object.entries(privileges).map(([roleKey, rolePrivs]) => (
            <Grid item xs={12} md={6} key={roleKey}>
              <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 2.5, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight={700}>{ROLE_LABELS[roleKey] ?? roleKey}</Typography>
                  <Chip
                    size="small"
                    label={Object.values(rolePrivs).flat().length + ' privilegios'}
                    sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }}
                  />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack gap={1.5}>
                  {MODULES.map((mod) => {
                    const granted = rolePrivs[mod];
                    return (
                      <Box key={mod}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary"
                          sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {mod}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          {ACTIONS.map((action) => {
                            const active = granted.includes(action);
                            return (
                              <Stack
                                key={action}
                                direction="row"
                                alignItems="center"
                                gap={0.5}
                                onClick={() => toggleAction(roleKey, mod, action)}
                                sx={{
                                  cursor: 'pointer',
                                  px: 1, py: 0.25,
                                  border: `1px solid ${active ? '#FDC726' : '#E8E8E8'}`,
                                  borderRadius: 1.5,
                                  bgcolor: active ? '#FFF8E1' : 'transparent',
                                  '&:hover': { borderColor: '#FDC726' },
                                }}
                              >
                                <Switch
                                  size="small"
                                  checked={active}
                                  onChange={() => {}}
                                  sx={{
                                    width: 32, height: 20, p: 0,
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#FDC726', transform: 'translateX(12px)' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#FDC726' },
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
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
