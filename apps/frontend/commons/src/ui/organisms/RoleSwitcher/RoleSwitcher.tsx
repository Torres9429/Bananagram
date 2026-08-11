'use client';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { MOCK_TOKENS, type MockRole } from '../../../mocks/mock-tokens';
import { setCredentials, selectUser } from '../../../state/auth.slice';

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
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const activeRole = user?.roles?.map((r) => ROLE_KEY_BY_JWT_ROLE[r]).find(Boolean);

  // Estos colores se interpolan en CSS plano (border/bgcolor por rol), así
  // que se leen del theme directamente en vez de usar rutas de paleta en sx.
  // #7B1FA2 (admin) no tiene equivalente en el theme — se deja como hex.
  const ROLES: { key: MockRole; label: string; color: string }[] = [
    { key: 'admin', label: 'Administrador', color: '#7B1FA2' },
    { key: 'cm', label: 'CM', color: theme.palette.info.main },
    { key: 'disenador', label: 'Diseñador', color: theme.palette.success.main },
    { key: 'cliente', label: 'Cliente', color: theme.palette.warning.main },
  ];

  function switchRole(role: MockRole) {
    // RoleSwitcher desactivado — si se reactiva, debe usar setCookieToken.
    // import { setCookieToken } from '../../session/cookieSession';
    dispatch(setCredentials({ accessToken: MOCK_TOKENS[role] }));
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1300,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
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
