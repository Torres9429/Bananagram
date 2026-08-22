import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { ScrollReveal } from '../molecules/ScrollReveal';
import type { FlowNode } from '../../../interfaces/interface';

const FLOW: FlowNode[] = [
  { icon: <PersonOutlineOutlinedIcon />, title: 'Cliente', description: 'Define el objetivo y la visión de marca.' },
  { icon: <SupportAgentOutlinedIcon />, title: 'Community Manager', description: 'Organiza el calendario y coordina aprobaciones.' },
  { icon: <BrushOutlinedIcon />, title: 'Diseñador', description: 'Da vida a la idea con piezas creativas.' },
  { icon: <SendOutlinedIcon />, title: 'Publicación', description: 'Sale a todas las redes, sincronizada.' },
  { icon: <InsightsOutlinedIcon />, title: 'Métricas', description: 'Mide el impacto y alimenta la próxima campaña.' },
];

export function CollaborationSection() {
  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="sm">
        <ScrollReveal>
        <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="overline" color="secondary.main" fontWeight={700}>
            Trabajo colaborativo
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            De la idea del cliente a los resultados, en un solo flujo
          </Typography>
        </Stack>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
        <Stack spacing={0} alignItems="center">
          {FLOW.map((node, index) => (
            <Box key={node.title} sx={{ width: '100%' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {node.icon}
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    {node.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {node.description}
                  </Typography>
                </Box>
              </Paper>
              {index < FLOW.length - 1 && (
                <Stack alignItems="center" sx={{ py: 1 }}>
                  <ArrowDownwardOutlinedIcon fontSize="small" sx={{ color: 'divider' }} />
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
