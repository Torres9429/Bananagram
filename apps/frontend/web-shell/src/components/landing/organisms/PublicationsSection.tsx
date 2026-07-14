import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Badge, type BadgeTone } from '../atoms/Badge';
import { ScrollReveal } from '../molecules/ScrollReveal';

interface TimelineStep {
  status: string;
  tone: BadgeTone;
  description: string;
  timestamp: string;
}

const STEPS: TimelineStep[] = [
  { status: 'Borrador', tone: 'neutral', description: 'La diseñadora sube 3 piezas creativas.', timestamp: 'hace 2 días' },
  { status: 'En revisión', tone: 'warning', description: 'El Community Manager deja comentarios de ajuste.', timestamp: 'hace 1 día' },
  { status: 'Aprobado', tone: 'success', description: 'El cliente aprueba la campaña de temporada.', timestamp: 'hace 20 h' },
  { status: 'Programado', tone: 'info', description: 'La publicación queda agendada en el calendario.', timestamp: 'mañana, 9:00 a. m.' },
  { status: 'Publicado', tone: 'success', description: 'Ya está en vivo en Instagram y TikTok.', timestamp: 'justo ahora' },
];

export function PublicationsSection() {
  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        zIndex: 1,
        py: { xs: 8, md: 12 },
        bgcolor: 'primary.light',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="md">
        <ScrollReveal>
        <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="overline" color="secondary.main" fontWeight={700}>
            Publicaciones
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            De la idea a publicado, sin perder el hilo
          </Typography>
        </Stack>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
        <Stack spacing={0}>
          {STEPS.map((step, index) => (
            <Stack key={step.status} direction="row" spacing={2}>
              <Stack alignItems="center" sx={{ width: 16 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', mt: 1 }} />
                {index < STEPS.length - 1 && <Box sx={{ width: '2px', flex: 1, bgcolor: 'divider', my: 0.5 }} />}
              </Stack>
              <Paper elevation={0} sx={{ flex: 1, p: 2.5, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, transition: 'transform 0.25s ease, box-shadow 0.25s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Badge label={step.status} tone={step.tone} />
                  <Typography variant="caption" color="text.secondary">
                    {step.timestamp}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {step.description}
                </Typography>
              </Paper>
            </Stack>
          ))}
        </Stack>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
