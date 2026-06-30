'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { BrandTabs } from '../../../../components/BrandTabs';
import { MOCK_BRANDS, MOCK_CAMPAIGNS } from '../../../../lib/mock-data';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function BrandMetricsPage() {
  const params = useParams<{ id: string }>();
  const brand = MOCK_BRANDS.find((b) => b.id === params.id) ?? MOCK_BRANDS[0];
  const campaigns = MOCK_CAMPAIGNS.filter((c) => c.brandId === brand.id);
  const totalPosts = campaigns.reduce((acc, c) => acc + c.postsCount, 0);

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Métricas — {brand.name}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Engagement" value={`${brand.score.engagement}%`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Consistencia" value={brand.score.consistency} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Campañas activas" value={brand.activeCampaigns} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard label="Publicaciones totales" value={totalPosts} />
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" mt={3}>
          Para el detalle de engagement por publicación y comparativos entre marcas, ve a{' '}
          <Box component="a" href="http://localhost:3011/metrics" sx={{ color: '#7A5C00', fontWeight: 600 }}>
            Métricas globales
          </Box>.
        </Typography>
      </Box>
    </Box>
  );
}
