'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider as ReduxProvider } from 'react-redux';
import { theme, EmotionCacheProvider } from '@repo/ui/theme';
import { useSessionBootstrap, useNotificationStream, ToastProvider } from '@repo/ui/ui';
import { store } from '../store';
import { AppShell } from '../components/AppShell';
import { useCampaignsLiveRefresh } from '../hooks/useCampaignsLiveRefresh';

function SessionBootstrap() {
  useSessionBootstrap();
  useNotificationStream();
  useCampaignsLiveRefresh();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ReduxProvider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionBootstrap />
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </ReduxProvider>
    </EmotionCacheProvider>
  );
}
