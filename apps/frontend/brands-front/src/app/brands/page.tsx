'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import { MOCK_PROFILES } from '../../lib/mock-data';

const CLASSIFICATION_STYLE = {
  alto: { bg: '#E8F5E9', color: '#2E7D32' },
  medio: { bg: '#FFF3E0', color: '#E65100' },
  bajo: { bg: '#FFEBEE', color: '#C62828' },
};

export default function BrandsPage() {
  const router = useRouter();

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%', p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Marcas</Typography>
      <Grid container spacing={2}>
        {MOCK_PROFILES.map((brand) => {
          const cls = CLASSIFICATION_STYLE[brand.score.classification];
          return (
            <Grid item xs={12} sm={6} md={4} key={brand.id}>
              <Paper
                elevation={0}
                onClick={() => router.push(`/brands/${brand.id}`)}
                sx={{ border: '1px solid #E8E8E8', borderRadius: 3, p: 2.5, cursor: 'pointer', '&:hover': { borderColor: '#E0A800' } }}
              >
                <Stack direction="row" gap={1.5} alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: brand.color, width: 44, height: 44, fontWeight: 700 }}>
                    {brand.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{brand.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{brand.category}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Chip size="small" label={`${brand.activeCampaigns} campañas activas`} sx={{ bgcolor: '#FFF8E1', color: 'primary.contrastTextMuted', fontWeight: 600 }} />
                  <Chip size="small" label={`Score ${brand.score.score}`} sx={{ bgcolor: cls.bg, color: cls.color, fontWeight: 700 }} />
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
