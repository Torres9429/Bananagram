'use client';

import Box from '@mui/material/Box';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TopBar title="Marcas" />
        {children}
      </Box>
    </Box>
  );
}
