import { createTheme } from '@mui/material/styles';

// contrastTextMuted: texto oscuro (o contenido secundario) sobre superficies
// claras derivadas de primary (chips, avatares y fondos en primary.light) —
// se nombra por su función, no por su apariencia, porque no es un color de
// marca independiente sino una variante de contraste de primary.
declare module '@mui/material/styles' {
  interface PaletteColor {
    contrastTextMuted?: string;
  }
  interface SimplePaletteColorOptions {
    contrastTextMuted?: string;
  }
}

export const theme = createTheme({
  palette: {
    primary: { main: '#E0A800', dark: '#D4AC40', light: '#FFF8E1', contrastText: '#FFFFFF', contrastTextMuted: '#7A5C00' },
    secondary: { main: '#C08E06', contrastText: '#FFFFFF' },
    success: { main: '#2E7D32', dark: '#1B5E20', light: '#E8F5E9', contrastText: '#FFFFFF' },
    error: { main: '#C62828', light: '#FFEBEE', contrastText: '#FFFFFF' },
    warning: { main: '#E65100', light: '#FFF3E0', contrastText: '#FFFFFF' },
    info: { main: '#1565C0', light: '#E3F2FD', contrastText: '#FFFFFF' },
    background: { default: '#F7F7F7', paper: '#FFFFFF' },
    text: { primary: '#1A1A1A', secondary: '#8F8F8F' },
    divider: '#E8E8E8',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: 'var(--font-poppins), "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    // Nota: dentro de `components.styleOverrides`, los callbacks `({ theme }) => ({...})`
    // son la única forma correcta de leer el theme — las rutas de paleta como
    // 'primary.main' son strings literales ahí y NO se resuelven (eso solo
    // funciona dentro de la prop `sx` de un componente).
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&.Mui-focusVisible': { boxShadow: 'none' },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, overflow: 'hidden' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.contrastText,
          fontWeight: 700,
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '16px 24px' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.dark },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main, borderWidth: 2 },
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({ '&.Mui-focused': { color: theme.palette.primary.contrastText } }),
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.dark,
          '&.Mui-checked': { color: theme.palette.primary.main },
        }),
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.primary.dark,
          '&.Mui-checked': { color: theme.palette.primary.main },
        }),
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: ({ theme }) => ({
          '&.Mui-checked': { color: theme.palette.primary.main },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: theme.palette.primary.main, opacity: 0.5 },
        }),
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: theme.palette.primary.contrastText, fontWeight: 700 },
        }),
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: ({ theme }) => ({ backgroundColor: theme.palette.primary.main, height: 3 }),
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});
