'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { EmptyState, usePermissions } from '@repo/ui';
import { AdminTabs } from '../../components/AdminTabs';
import { MOCK_ROLES } from '../../lib/mock-data';

export default function RolesPage() {
  const { can } = usePermissions();

  if (!can('users', 'manage')) {
    return (
      <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
        <AdminTabs />
        <EmptyState title="No tienes permisos para gestionar roles" />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <AdminTabs />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>Roles y permisos</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Los permisos viven en base de datos (role_permissions) — esta vista es solo lectura por ahora.
        </Typography>
        <Grid container spacing={2}>
          {MOCK_ROLES.map((role) => (
            <Grid item xs={12} md={6} key={role.id}>
              <Paper elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 2.5, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="subtitle1" fontWeight={700}>{role.name}</Typography>
                  <Chip size="small" label={`${role.userCount} usuarios`} sx={{ bgcolor: '#FFF8E1', color: '#7A5C00', fontWeight: 600 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={2}>{role.description}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack gap={1}>
                  {Object.entries(role.permissions).map(([module, actions]) => (
                    <Stack key={module} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 90, color: '#6B6B6B' }}>
                        {module}
                      </Typography>
                      {actions.map((a) => (
                        <Chip key={a} size="small" label={a} sx={{ bgcolor: '#F5F5F5', fontSize: 11 }} />
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
