'use client';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { MOCK_TOKENS, type MockRole } from '../../../mocks/mock-tokens';
import { setCredentials, selectUser } from '../../../state/auth.slice';

const ROLES: { key: MockRole; label: string; color: string }[] = [
  { key: 'admin', label: 'Administrador', color: '#7B1FA2' },
  { key: 'cm', label: 'CM', color: '#1565C0' },
  { key: 'disenador', label: 'Diseñador', color: '#2E7D32' },
  { key: 'cliente', label: 'Cliente', color: '#E65100' },
];

// El JWT mock guarda el rol con el nombre "de negocio" (administrador,
// community_manager, ...), no con la key de MOCK_TOKENS — este mapeo
// reconcilia ambos para poder resaltar el chip activo.
const ROLE_KEY_BY_JWT_ROLE: Record<string, MockRole> = {
  administrador: 'admin',
  community_manager: 'cm',
  disenador: 'disenador',
  cliente: 'cliente',
};

export function RoleSwitcher() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const activeRole = user ? ROLE_KEY_BY_JWT_ROLE[user.role] : undefined;

  function switchRole(role: MockRole) {
    dispatch(setCredentials({ accessToken: MOCK_TOKENS[role] }));
    localStorage.setItem('mock_access_token', MOCK_TOKENS[role]);
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1300,
        bgcolor: '#fff',
        border: '1px solid #E8E8E8',
        borderRadius: 3,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        p: 1.5,
      }}
    >
      <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
        🎭 Simular rol
      </Typography>
      <Stack direction="row" gap={0.75} flexWrap="wrap">
        {ROLES.map((r) => (
          <Chip
            key={r.key}
            label={r.label}
            size="small"
            onClick={() => switchRole(r.key)}
            sx={{
              bgcolor: activeRole === r.key ? r.color : 'transparent',
              color: activeRole === r.key ? 'white' : r.color,
              border: `1px solid ${r.color}`,
              fontWeight: 600,
              fontSize: 11,
              cursor: 'pointer',
              '&:hover': { bgcolor: r.color, color: 'white' },
            }}
          />
        ))}
      </Stack>
      {user && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          Sesión: {user.email}
        </Typography>
      )}
    </Box>
  );
}
