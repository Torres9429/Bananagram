'use client';

import { usePathname, useRouter } from 'next/navigation';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

const SECTIONS = [
  { suffix: '', label: 'Resumen' },
  { suffix: '/campaigns', label: 'Campañas' },
  { suffix: '/calendar', label: 'Calendario' },
  { suffix: '/metrics', label: 'Métricas' },
  { suffix: '/score', label: 'Score' },
  { suffix: '/reports', label: 'Reportes' },
];

export function BrandTabs({ brandId }: { brandId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/brands/${brandId}`;

  const current =
    SECTIONS.slice().reverse().find((s) => pathname === `${base}${s.suffix}` || (s.suffix !== '' && pathname.startsWith(`${base}${s.suffix}`)))
      ?.suffix ?? '';

  return (
    <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 3 }}>
      <Tabs
        value={current}
        onChange={(_, value) => router.push(`${base}${value}`)}
        variant="scrollable"
        scrollButtons="auto"
        TabIndicatorProps={{ sx: { bgcolor: '#FDC726', height: 3 } }}
        sx={{ '& .Mui-selected': { color: '#7A5C00 !important', fontWeight: 700 } }}
      >
        {SECTIONS.map((s) => (
          <Tab key={s.suffix} value={s.suffix} label={s.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
        ))}
      </Tabs>
    </Box>
  );
}
