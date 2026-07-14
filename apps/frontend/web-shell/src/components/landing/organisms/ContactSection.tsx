import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { LabeledField } from '@repo/ui/ui';
import { LandingButton } from '../atoms/LandingButton';
import { ScrollReveal } from '../molecules/ScrollReveal';

/** Sección normal, siempre visible — ya no depende de ningún click ni queda oculta. */
export function ContactSection() {
  return (
    <Box
      id="contacto"
      component="section"
      sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 12 }, scrollMarginTop: '88px', bgcolor: 'primary.light' }}
    >
      <Container maxWidth="sm">
        <ScrollReveal>
          <Paper
            elevation={0}
            sx={{ p: { xs: 3, md: 5 }, borderRadius: 5, border: '1px solid', borderColor: 'divider', boxShadow: 6 }}
          >
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="overline" color="secondary.main" fontWeight={700}>
                Contacto
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                Hablemos de tu próxima campaña
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cuéntanos qué necesitas y te respondemos en menos de 24 horas.
              </Typography>
            </Stack>

            <Box component="form" onSubmit={(event) => event.preventDefault()}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <LabeledField label="Nombre" placeholder="Tu nombre" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LabeledField label="Correo" type="email" placeholder="tu@empresa.com" />
                </Grid>
                <Grid item xs={12}>
                  <LabeledField label="Empresa" placeholder="Nombre de tu empresa" />
                </Grid>
                <Grid item xs={12}>
                  <LabeledField label="Mensaje" placeholder="Cuéntanos sobre tu equipo y objetivos" multiline rows={4} />
                </Grid>
              </Grid>
              <LandingButton type="submit" variant="primary" sx={{ mt: 1 }}>
                Hablemos
              </LandingButton>
            </Box>
          </Paper>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
