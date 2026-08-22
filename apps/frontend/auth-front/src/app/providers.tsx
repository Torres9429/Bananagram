'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider as ReduxProvider } from 'react-redux';
import { theme, EmotionCacheProvider } from '@repo/ui/theme';
import { useSessionBootstrap, ToastProvider } from '@repo/ui/ui';
import { store } from '../store';

function SessionBootstrap() {
  useSessionBootstrap();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ReduxProvider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionBootstrap />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </ReduxProvider>
    </EmotionCacheProvider>
  );
}
