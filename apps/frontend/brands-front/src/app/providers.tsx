'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider as ReduxProvider } from 'react-redux';
import { theme, EmotionCacheProvider, useMockSessionFromUrl } from '@repo/ui';
import { store } from '../store';
import { AppShell } from '../components/AppShell';

function SessionBootstrap() {
  useMockSessionFromUrl();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ReduxProvider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionBootstrap />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </ReduxProvider>
    </EmotionCacheProvider>
  );
}
