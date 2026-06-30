'use client';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { NotificationBell } from '@repo/ui';

export function TopBar({ title }: { title: string }) {
  return (
    <AppBar position="static" elevation={0} color="default">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
        <NotificationBell />
      </Toolbar>
    </AppBar>
  );
}
