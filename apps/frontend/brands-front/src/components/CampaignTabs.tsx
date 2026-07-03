'use client';

import { usePathname, useRouter } from 'next/navigation';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const SECTIONS = [
  { suffix: '', label: 'Resumen' },
  { suffix: '/posts', label: 'Publicaciones' },
  { suffix: '/team', label: 'Equipo' },
];

interface Props {
  brandId: string;
  campaignId: string;
  backHref?: string;
}

export function CampaignTabs({ brandId, campaignId, backHref }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/brands/${brandId}/campaigns/${campaignId}`;

  const current =
    SECTIONS.slice().reverse().find((s) => pathname === `${base}${s.suffix}` || (s.suffix !== '' && pathname.startsWith(`${base}${s.suffix}`)))
      ?.suffix ?? '';

  return (
    <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 1 }}>
      <Stack direction="row" alignItems="center">
        <Tooltip title="Volver">
          <IconButton
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            sx={{ color: 'secondary.main', ml: 1 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tabs
          value={current}
          onChange={(_, value) => router.push(`${base}${value}`)}
          TabIndicatorProps={{ sx: { bgcolor: '#E0A800', height: 3 } }}
          sx={{ '& .Mui-selected': { color: '#7A5C00 !important', fontWeight: 700 } }}
        >
          {SECTIONS.map((s) => (
            <Tab key={s.suffix} value={s.suffix} label={s.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>
      </Stack>
    </Box>
  );
}
