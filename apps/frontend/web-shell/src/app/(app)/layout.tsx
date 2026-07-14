'use client';
import { TopBar } from '@repo/ui/ui';
import { Sidebar } from '../../components/layout/Sidebar';
import Box from '@mui/material/Box';
// RoleSwitcher desactivado: el login real (LoginForm + MOCK_USERS) es ahora
// la única fuente de verdad de la sesión. El switcher escribía su propio
// token en localStorage compitiendo con el login y rompiendo la consistencia
// de permisos entre zonas. Reactivar solo si se reintroduce como un atajo
// de QA que también pase por findUserByCredentials/buildTokenFromUser.
// import { RoleSwitcher } from '@repo/ui';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1 }}>
        <TopBar />
        <Box component="main" sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}
