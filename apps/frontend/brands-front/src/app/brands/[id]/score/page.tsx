'use client';

import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { ScoreGauge } from '@repo/ui/ui';
import { BrandTabs } from '../../../../components/BrandTabs';
import { MOCK_PROFILES } from '../../../../lib/mock-data';

const COMPONENTS = [
  { key: 'consistency', label: 'Consistencia', weight: 30, color: '#E0A800' },
  { key: 'engagement', label: 'Engagement', weight: 40, color: '#42A5F5' },
  { key: 'frequency', label: 'Frecuencia', weight: 30, color: '#66BB6A' },
] as const;

export default function BrandScorePage() {
  const params = useParams<{ id: string }>();
  const brand = MOCK_PROFILES.find((b) => b.id === params.id) ?? MOCK_PROFILES[0];

  return (
    <Box sx={{ bgcolor: '#F7F7F7', minHeight: '100%' }}>
      <BrandTabs brandId={brand.id} />
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>Score Digital — {brand.name}</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Score = (Consistencia × 0.30) + (Engagement × 0.40) + (Frecuencia × 0.30) · última actualización {brand.score.snapshotDate}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
              <ScoreGauge score={brand.score.score} classification={brand.score.classification} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E8E8E8', borderRadius: 3, height: '100%' }}>
              <Stack gap={2.5}>
                {COMPONENTS.map((comp) => (
                  <Box key={comp.key}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {comp.label} <Typography component="span" variant="caption" color="text.secondary">(peso {comp.weight}%)</Typography>
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>{brand.score[comp.key]}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={brand.score[comp.key]}
                      sx={{ height: 8, borderRadius: 4, bgcolor: '#F5F5F5', '& .MuiLinearProgress-bar': { backgroundColor: comp.color } }}
                    />
                  </Box>
                ))}
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      Cobertura <Typography component="span" variant="caption" color="text.secondary">(informativo, no pondera)</Typography>
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>{brand.score.coverage}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={brand.score.coverage}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#F5F5F5', '& .MuiLinearProgress-bar': { backgroundColor: '#BDBDBD' } }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
