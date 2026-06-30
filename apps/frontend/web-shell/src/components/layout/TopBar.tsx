'use client';
import { useDispatch } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LogoutIcon from '@mui/icons-material/Logout';
import { NotificationBell, logout } from '@repo/ui';

const AUTH_FRONT_LOGIN_URL = 'http://localhost:3012/login';

export function TopBar() {
  const dispatch = useDispatch();

  function handleLogout() {
    dispatch(logout());
    localStorage.removeItem('mock_access_token');
    window.location.href = AUTH_FRONT_LOGIN_URL;
  }

  return (
    <AppBar position="static" elevation={0} color="default">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Gestor de Redes</Typography>
        <NotificationBell />
        <Tooltip title="Cerrar sesión">
          <IconButton onClick={handleLogout} sx={{ color: '#7A5C00' }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
