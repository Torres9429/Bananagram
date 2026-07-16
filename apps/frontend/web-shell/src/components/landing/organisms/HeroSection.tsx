'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useTheme } from '@mui/material/styles';
import { motion, useMotionValue, useReducedMotion, animate } from 'framer-motion';
import { ZONE_URLS } from '@repo/ui/config';
import { HeroAction } from '../molecules/HeroAction';
import { ScrollReveal } from '../molecules/ScrollReveal';
import { Marquee } from '../molecules/Marquee';

const NETWORKS = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'YouTube', 'Pinterest', 'X / Twitter'];
const TEAM_INITIALS = [
  { label: 'A', tone: 'primary.main' },
  { label: 'M', tone: 'success.main' },
  { label: 'C', tone: 'warning.main' },
  { label: 'R', tone: 'info.main' },
];



export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const node = sceneRef.current;
    if (!node) return;

    function handleMove(event: MouseEvent) {
      const rect = node!.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      animate(tiltY, relX * 6, { duration: 0.4 });
      animate(tiltX, relY * -6, { duration: 0.4 });
    }
    function handleLeave() {
      animate(tiltX, 0, { duration: 0.5 });
      animate(tiltY, 0, { duration: 0.5 });
    }

    node.addEventListener('mousemove', handleMove);
    node.addEventListener('mouseleave', handleLeave);
    return () => {
      node.removeEventListener('mousemove', handleMove);
      node.removeEventListener('mouseleave', handleLeave);
    };
  }, [reduceMotion, tiltX, tiltY]);

  return (
    <Box id="inicio" component="section" sx={{ scrollMarginTop: '88px' }}>
      <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: { xs: 'auto', md: '88vh' }, display: 'flex', alignItems: 'center', py: { xs: 8, md: 0 } }}>
  

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 6, md: 4 }} alignItems="center">
            <ScrollReveal>
              <Box sx={{ flex: 1 }}>
                <Image src="/LogoNameMonkey.png" alt="Bananagram" width={1146} height={308} style={{ width: 150, height: 'auto', marginBottom: 24 }} />

                <Typography variant="h2" fontWeight={700} sx={{ fontSize: { xs: '2.25rem', md: '3.25rem' }, lineHeight: 1.1 }}>
                  Gestiona todas tus redes sociales desde{' '}
                  <Box component="span" sx={{ color: 'secondary.main' }}>
                    un solo{' '}
                    <Box component="span" sx={{ position: 'relative', display: 'inline-block' }}>
                      lugar
                      <Box
                        component="svg"
                        viewBox="0 0 100 6"
                        preserveAspectRatio="none"
                        sx={{ position: 'absolute', left: 0, bottom: -6, width: '100%', height: 6, color: 'secondary.main' }}
                      >
                        <path d="M0 5 Q25 1 50 5 Q75 1 100 5" stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                      </Box>
                    </Box>
                  </Box>
                  .
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mt: 3, maxWidth: 480, fontSize: '1.05rem' }}>
                  Campañas, publicaciones, calendario y métricas de todo tu equipo, centralizados en Bananagram — para
                  que nada se pierda entre aprobaciones y entregas.
                </Typography>

                <HeroAction
                  onPrimaryClick={() => window.location.assign(`${ZONE_URLS.authFront}/register`)}
                  onSecondaryClick={() => {
                    const target = document.getElementById('contacto');
                    target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                  }}
                />

                <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 5 }}>
                  <Stack direction="row" sx={{ '& > *': { ml: -1.25, border: '2px solid', borderColor: 'background.default' } }}>
                    {TEAM_INITIALS.map((member) => (
                      <Box
                        key={member.label}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: member.tone,
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {member.label}
                      </Box>
                    ))}
                  </Stack>
                  <Box>
                    <Stack direction="row" spacing={0.25}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon key={index} sx={{ fontSize: 14, color: 'primary.main' }} />
                      ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Equipos de marketing ya organizan sus redes con Bananagram
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <Box ref={sceneRef} sx={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Box component={motion.div} style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 800 }} sx={{ width: '100%', maxWidth: 420 }}>
                  {/* Una sola card en flujo normal (sin elementos absolutos superpuestos) para que nunca se recorte ni se pise. */}
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 8 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="overline" color="text.secondary" fontWeight={700}>
                        Esta semana
                      </Typography>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CalendarMonthOutlinedIcon fontSize="small" />
                      </Box>
                    </Stack>

                    <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                      6 publicaciones
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      3 equipos · 4 canales
                    </Typography>

                    <Stack spacing={1.5} sx={{ mt: 3 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <TrendingUpOutlinedIcon fontSize="small" />
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                          Alcance
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.dark">
                          +24%
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            bgcolor: 'info.light',
                            color: 'info.dark',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                          Publicado a tiempo
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="info.dark">
                          100%
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Box>
              </Box>
            </ScrollReveal>
          </Stack>
        </Container>
      </Box>

      <Marquee items={NETWORKS} />
    </Box>
  );
}
