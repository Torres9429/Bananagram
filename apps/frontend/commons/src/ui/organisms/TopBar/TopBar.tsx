'use client';

import { useDispatch } from 'react-redux';
import AppBar, { type AppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import { NotificationBell } from '../../molecules/NotificationBell/NotificationBell';
import { logout } from '../../../state/auth.slice';
import { deleteCookieToken, deleteRefreshCookieToken } from '../../../session/cookieSession';
import { ZONE_URLS } from '../../../config/zone-urls';

interface TopBarProps {
  title?: string;
  color?: AppBarProps['color'];
}

// Compartido por las 6 apps (antes 5 copias casi idénticas de TopBar.tsx,
// una por app) — título y color quedan como props para no cambiar el
// comportamiento visible de ninguna.
export function TopBar({ title = 'Gestor de Redes', color }: TopBarProps) {
  const dispatch = useDispatch();

  function handleLogout() {
    deleteCookieToken();
    deleteRefreshCookieToken();
    dispatch(logout());
    window.location.href = `${ZONE_URLS.authFront}/login`;
  }

  return (
    <AppBar position="static" elevation={0} color={color} sx={{ borderBottom: '1px solid #F0F0F0', bgcolor: 'background.paper' }}>
      {/* pl en xs: en mobile el Sidebar flota un botón hamburguesa fijo
          (top:8, left:8) sobre el contenido — este padding le deja espacio
          para no empalmarse con el título. */}
      <Toolbar sx={{ pl: { xs: 7, sm: 2 } }}>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>{title}</Typography>
        <NotificationBell />
        <Tooltip title="Cerrar sesión">
          <IconButton onClick={handleLogout} sx={{ color: 'secondary.main' }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
