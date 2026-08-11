'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import { useListMyBrandsQuery } from '../../store/api/brands.api';
import { useListCampaignsQuery } from '../../store/api/campaigns.api';
import { useListCategoriesQuery } from '@repo/ui/state';

// Ruta LEGACY de browsing multi-marca para Admin (ver Sidebar) — ya conectada
// a datos reales. El Score Digital no se muestra: no hay endpoint HTTP
// todavía que lo exponga (score.service.ts existe en core-service pero sin
// controller, ver CLAUDE.md) — no se inventa un valor.
export default function BrandsPage() {
  const router = useRouter();
  const { data: brands = [], isFetching } = useListMyBrandsQuery();
  const { data: campaigns = [] } = useListCampaignsQuery();
  const { data: categories = [] } = useListCategoriesQuery();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Marcas</Typography>
      {isFetching && brands.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
      ) : (
        <Grid container spacing={2}>
          {brands.map((brand) => {
            const activeCampaigns = campaigns.filter((c) => c.brandId === brand.id && c.status === 'active').length;
            const categoryName = categories.find((c) => c.id === brand.categoryId)?.name ?? brand.categoryId ?? 'Sin categoría';
            return (
              <Grid item xs={12} sm={6} md={4} key={brand.id}>
                <Paper
                  elevation={0}
                  onClick={() => router.push(`/brands/${brand.id}`)}
                  sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 2.5, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
                >
                  <Stack direction="row" gap={1.5} alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: brand.primaryColor ?? '#E0A800', width: 44, height: 44, fontWeight: 700 }}>
                      {brand.name.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{brand.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{categoryName}</Typography>
                    </Box>
                  </Stack>
                  <Chip size="small" label={`${activeCampaigns} campañas activas`} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} />
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
