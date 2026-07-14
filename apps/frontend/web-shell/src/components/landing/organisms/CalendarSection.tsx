'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { motion, useReducedMotion } from 'framer-motion';
import { Chip } from '../atoms/Chip';
import { ScrollReveal } from '../molecules/ScrollReveal';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarSection() {
  const reduceMotion = useReducedMotion();

  return (
    <Box id="calendario" component="section" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: '88px' }}>
      <Container maxWidth="md">
        <ScrollReveal>
        <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="overline" color="secondary.main" fontWeight={700}>
            Calendario
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            Tu semana, de un vistazo
          </Typography>
        </Stack>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 4, boxShadow: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5 }}>
            {DAYS.map((day, index) => (
              <Box key={day}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {day}
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    minHeight: 96,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    p: 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                  }}
                >
                  {index === 1 && <Chip label="IG 10:00" tone="primary" />}
                  {index === 3 && (
                    <Box
                      component={motion.div}
                      animate={reduceMotion ? undefined : { x: [0, 46, 0] }}
                      transition={reduceMotion ? undefined : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Chip label="TikTok 14:00" tone="info" />
                    </Box>
                  )}
                  {index === 3 && (
                    <Chip
                      label="LinkedIn 9:00"
                      tone="neutral"
                      sx={{ opacity: 0.5, borderStyle: 'dashed' }}
                    />
                  )}
                  {index === 5 && <Chip label="IG 11:30" tone="primary" />}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
