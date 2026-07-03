'use client';

import { usePathname, useRouter } from 'next/navigation';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

const SECTIONS = [
  { value: '/users', label: 'Usuarios' },
  { value: '/roles', label: 'Roles' },
  { value: '/audit-log', label: 'Auditoría' },
  { value: '/catalogs/categories', label: 'Categorías' },
  { value: '/catalogs/social-networks', label: 'Redes sociales' },
  { value: '/catalogs/specialties', label: 'Especialidades' },
];

export function AdminTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const current = SECTIONS.find((s) => pathname.startsWith(s.value))?.value ?? '/users';

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
        {SECTIONS.map((s) => (
          <Tab key={s.value} value={s.value} label={s.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>
    </Box>
  );
}
