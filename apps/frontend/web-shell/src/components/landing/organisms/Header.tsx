'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { useReducedMotion } from 'framer-motion';
import { LandingButton } from '../atoms/LandingButton';

const HEADER_OFFSET = 88;

const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'funciones', label: 'Funciones' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'contacto', label: 'Contacto' },
];

/** Header público sticky: logo, navegación por ancla y accesos a login/demo. */
export function Header() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToId(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: scrolled ? 4 : 'none',
        transition: 'box-shadow 0.25s ease',
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => scrollToId('inicio')}>
            <Image src="/LogoNameMonkey.png" alt="Bananagram" width={1146} height={308} style={{ width: 120, height: 'auto' }} />
          </Box>

          <Stack direction="row" spacing={3.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {NAV_LINKS.map((link) => (
              <Button
                key={link.id}
                onClick={() => scrollToId(link.id)}
                sx={{ color: 'text.primary', fontWeight: 600, minWidth: 0, p: 0, '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              onClick={() => window.location.assign('/login')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.primary', fontWeight: 600 }}
            >
              Iniciar sesión
            </Button>
            <LandingButton variant="primary" size="small" onClick={() => scrollToId('contacto')}>
              Solicitar demo
            </LandingButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
