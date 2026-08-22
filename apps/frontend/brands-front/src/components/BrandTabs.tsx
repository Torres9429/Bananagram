'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Antes tenía tabs (Resumen/Campañas/Métricas/Score/Reportes). Se quitó esa
// navegación: Campañas ya tiene acceso real propio (Mis Campañas / perfil de
// Cliente), Métricas real vive en analytics-front (ítem de Sidebar), y
// Métricas/Score/Reportes bajo /brands/[id]/* seguían siendo 100% mock
// (MOCK_PROFILES, sin backend). Las páginas de esas 4 secciones NO se
// borraron — solo dejaron de tener este acceso; el detalle de marca queda
// como una vista de Resumen. `brandId` se mantiene en la firma para no tocar
// a los 5 llamadores existentes, aunque ya no se use aquí.
export function BrandTabs({ brandId: _brandId }: { brandId: string }) {
  const router = useRouter();

  return (
    <Box sx={{ borderBottom: '1px solid #E8E8E8', bgcolor: '#fff', px: 1 }}>
      <Stack direction="row" alignItems="center">
        <Tooltip title="Volver">
          <IconButton onClick={() => router.back()} sx={{ color: 'secondary.main', ml: 1, my: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
