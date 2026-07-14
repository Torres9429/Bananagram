import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import DonutSmallOutlinedIcon from '@mui/icons-material/DonutSmallOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { FeatureCard } from '../molecules/FeatureCard';
import { Chip } from '../atoms/Chip';
import { ScrollReveal } from '../molecules/ScrollReveal';

export function CampaignsSection() {
  return (
    <Box id="funciones" component="section" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: '88px' }}>
      <Container maxWidth="lg">
        <ScrollReveal>
        <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="overline" color="secondary.main" fontWeight={700}>
            Campañas
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Planifica campañas que se sienten como una sola idea
          </Typography>
        </Stack>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FeatureCard
              tone="primary"
              icon={<TrackChangesOutlinedIcon />}
              title="Objetivo y audiencia"
              description="Define el objetivo de la campaña y a quién le habla, con canales y segmentos claros desde el día uno."
              visual={
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label="Instagram" tone="primary" />
                  <Chip label="TikTok" tone="neutral" />
                  <Chip label="LinkedIn" tone="neutral" />
                </Stack>
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              tone="success"
              icon={<DonutSmallOutlinedIcon />}
              title="Presupuesto y calendario"
              description="Reparte el presupuesto entre canales y visualiza el cronograma completo de la campaña de un vistazo."
              visual={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Alcance proyectado
                  </Typography>
                  <LinearProgress variant="determinate" value={68} sx={{ height: 8, borderRadius: 999, mt: 0.5 }} />
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard
              tone="warning"
              icon={<AutoAwesomeOutlinedIcon />}
              title="Piezas creativas"
              description="El equipo de diseño sube variantes y el cliente aprueba directamente sobre cada pieza, sin salir del flujo."
              visual={<Chip label="3 variantes en revisión" tone="warning" />}
            />
          </Grid>
        </Grid>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
