import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { BrandPanel } from './BrandPanel';
import type { AuthLayoutProps } from '../interfaces/interface';

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: 960,
          minHeight: 560,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: 420, flexShrink: 0 }}>
          <BrandPanel />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', p: { xs: 4, md: 6 } }}>
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
