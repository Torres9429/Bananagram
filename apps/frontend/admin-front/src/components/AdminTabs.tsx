'use client';

import { usePathname, useRouter } from 'next/navigation';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { usePermissions } from '@repo/ui/ui';

// 'Auditoría' no lleva module/action: /audit-log sigue mock (sin
// AuditInterceptor real, ver CLAUDE.md) y no existe un módulo de permisos
// para ella en el catálogo — no se inventa uno, se deja siempre visible.
const SECTIONS: { value: string; label: string; module?: string; action?: string }[] = [
  { value: '/users', label: 'Usuarios', module: 'usuarios', action: 'ver' },
  { value: '/roles', label: 'Roles', module: 'privilegios', action: 'ver' },
  { value: '/audit-log', label: 'Auditoría' },
  { value: '/catalogs/categories', label: 'Categorías', module: 'catalogos', action: 'ver' },
  { value: '/catalogs/social-networks', label: 'Redes sociales', module: 'catalogos', action: 'ver' },
  { value: '/catalogs/specialties', label: 'Especialidades', module: 'catalogos', action: 'ver' },
];

export function AdminTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  const visibleSections = SECTIONS.filter((s) => !s.module || can(s.module, s.action!));
  const current = visibleSections.find((s) => pathname.startsWith(s.value))?.value ?? visibleSections[0]?.value ?? '/users';

  return (
    <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 3 }}>
      <Tabs
        value={current}
        onChange={(_, value) => router.push(value)}
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{ sx: { bgcolor: '#E0A800', height: 3 } }}
        sx={{ '& .Mui-selected': { color: '#7A5C00 !important', fontWeight: 700 } }}
      >
        {visibleSections.map((s) => (
          <Tab key={s.value} value={s.value} label={s.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>
    </Box>
  );
}
