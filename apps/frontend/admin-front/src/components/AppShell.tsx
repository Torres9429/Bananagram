'use client';

import Box from '@mui/material/Box';
import { TopBar } from '@repo/ui/ui';
import { Sidebar } from './layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TopBar title="Administración" />
        {children}
      </Box>
    </Box>
  );
}
