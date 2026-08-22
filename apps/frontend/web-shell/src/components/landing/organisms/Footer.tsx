import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Image from 'next/image';

const PRODUCT_LINKS = [
  { label: 'Funciones', href: '#funciones' },
  { label: 'Calendario', href: '#calendario' },
  { label: 'Métricas', href: '#metricas' },
  { label: 'Contacto', href: '#contacto' },
];

const ACCOUNT_LINKS = [
  { label: 'Iniciar sesión', href: '/login' },
  { label: 'Solicitar demo', href: '#contacto' },
];

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} underline="hover" sx={{ color: 'text.primary', opacity: 0.75, fontSize: 14, '&:hover': { opacity: 1 } }}>
      {label}
    </Link>
  );
}

export function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: 'secondary.main', color: 'text.primary', pt: 8, pb: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 5, md: 4 }}>
          <Grid item xs={12} md={5}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
              <Image src="/LogoMonkey.png" alt="" width={308} height={308} style={{ width: 36, height: 36 }} />
              <Typography variant="h6" fontWeight={700}>
                Bananagram
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.75, maxWidth: 320 }}>
              La plataforma para gestionar campañas, publicaciones y métricas de todo tu equipo, en un solo lugar.
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Producto
            </Typography>
            <Stack spacing={1.25}>
              {PRODUCT_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </Stack>
          </Grid>

          <Grid item xs={6} md={4}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Cuenta
            </Typography>
            <Stack spacing={1.25}>
              {ACCOUNT_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Stack sx={{ mt: 6, pt: 4 }}>
          <Typography variant="caption" sx={{ opacity: 0.65 }}>
            © {new Date().getFullYear()} Bananagram. Todos los derechos reservados.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
