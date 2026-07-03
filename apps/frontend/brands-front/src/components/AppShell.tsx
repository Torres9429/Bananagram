'use client';

import Box from '@mui/material/Box';
import { usePathname } from 'next/navigation';
import { Sidebar } from './layout/Sidebar';
import { TopBar } from './layout/TopBar';
import { getTopBarTitle } from '../lib/topbar-titles';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getTopBarTitle(pathname ?? '');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TopBar title={title} />
        {children}
      </Box>
    </Box>
  );
}
