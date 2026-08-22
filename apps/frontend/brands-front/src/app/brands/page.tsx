'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { PrimaryButton, EmptyState, usePermissions } from '@repo/ui/ui';
import { useListMyBrandsQuery } from '../../store/api/brands.api';
import { useListCampaignsQuery } from '../../store/api/campaigns.api';
import { useGetBrandScoreQuery } from '../../store/api/metrics.api';
import { useListCategoriesQuery } from '@repo/ui/state';
import { CreateBrandDialog } from '../../components/CreateBrandDialog';

const SCORE_CHIP_COLOR: Record<string, { bg: string; color: string }> = {
  bajo: { bg: '#FFEBEE', color: '#C62828' },
  medio: { bg: '#FFF3E0', color: '#E65100' },
  alto: { bg: '#E8F5E9', color: '#2E7D32' },
};

// Subcomponente propio (no inline en el .map) porque cada card necesita su
// propia llamada a useGetBrandScoreQuery — un hook no puede llamarse dentro
// de un .map directamente (Rules of Hooks).
function BrandScoreChip({ brandId }: { brandId: string }) {
  const { data: score } = useGetBrandScoreQuery(brandId);
  if (!score) return null;
  const style = SCORE_CHIP_COLOR[score.classification] ?? { bg: '#F5F5F5', color: '#616161' };
  return <Chip size="small" label={`Score ${Math.round(score.score)}`} sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600 }} />;
}

// Ruta LEGACY de browsing multi-marca para Admin/Cliente (ver Sidebar) — ya
// conectada a datos reales, incluido el Score Digital real por card
// (GET brands/:id/score — antes el comentario acá decía que no había
// endpoint todavía, desactualizado; analytics-front ya lo consume hace
// tiempo vía ScoreExplanationPanel).
//
// "Nueva marca" agregado (hallazgo real, reportado en vivo): esta pantalla
// nunca tuvo botón de crear — solo ClientSection (ruta /profile) lo tenía.
// Como el ítem "Marcas" del Sidebar también es visible para Cliente
// (marcas:ver, otorgado vía la cascada ver↔resto al tener marcas:crear/
// editar), quien entraba por acá en vez de por "Mi perfil" no tenía ninguna
// forma de crear una marca. Mismo CreateBrandDialog real, mismo gate.
export default function BrandsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: brands = [], isFetching } = useListMyBrandsQuery();
  const { data: campaigns = [] } = useListCampaignsQuery();
  const { data: categories = [] } = useListCategoriesQuery();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Marcas</Typography>
        {can('marcas', 'crear') && (
          <PrimaryButton startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateOpen(true)}>
            Nueva marca
          </PrimaryButton>
        )}
      </Stack>
      {isFetching && brands.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Cargando…</Typography>
      ) : brands.length === 0 ? (
        <EmptyState
          title="Aún no hay marcas"
          description="Crea la primera para conectar redes sociales reales y empezar a coordinar campañas."
          action={
            can('marcas', 'crear') ? (
              <PrimaryButton startIcon={<AddCircleOutlineIcon />} onClick={() => setCreateOpen(true)}>
                Crear marca
              </PrimaryButton>
            ) : undefined
          }
        />
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
                    <Avatar src={brand.logoUrl ?? undefined} sx={{ bgcolor: brand.primaryColor ?? '#E0A800', width: 44, height: 44, fontWeight: 700 }}>
                      {brand.name.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>{brand.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{categoryName}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip size="small" label={`${activeCampaigns} campañas activas`} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} />
                    {can('score', 'ver') && <BrandScoreChip brandId={brand.id} />}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
      <CreateBrandDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
