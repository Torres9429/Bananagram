import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#FDC726' },
    secondary: { main: '#D4AC40' },
    background: { default: '#F7F7F7', paper: '#FFFFFF' },
    text: { secondary: '#8F8F8F' },
  },
  typography: {
    fontFamily: 'var(--font-poppins), "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
  },
});
