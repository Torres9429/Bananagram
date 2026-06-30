'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider as ReduxProvider } from 'react-redux';
import { theme, EmotionCacheProvider } from '@repo/ui';
import { store } from '../store';
// RoleSwitcher desactivado: el login real (LoginForm + MOCK_USERS) es ahora
// la única fuente de verdad de la sesión. El switcher escribía su propio
// token en localStorage compitiendo con el login y rompiendo la consistencia
// de permisos entre zonas. Reactivar solo si se reintroduce como un atajo
// de QA que también pase por findUserByCredentials/buildTokenFromUser.
// import { RoleSwitcher } from '@repo/ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ReduxProvider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ReduxProvider>
    </EmotionCacheProvider>
  );
}
