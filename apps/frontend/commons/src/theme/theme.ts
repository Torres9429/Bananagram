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
        // Bug real (2026-08-19): contrastText es blanco, pensado para texto
        // sobre una superficie PINTADA de primary (botones, DialogTitle) —
        // el label de un TextField enfocado se ve sobre fondo blanco/claro,
        // así que quedaba blanco sobre blanco, invisible. contrastTextMuted
        // es la variante ya pensada para esto (texto con tono primary sobre
        // superficies claras), mismo criterio que ya usan Checkbox/Radio al
        // marcarse.
        root: ({ theme }) => ({ '&.Mui-focused': { color: theme.palette.primary.contrastTextMuted } }),
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
          // Mismo bug/fix que MuiInputLabel de arriba: contrastText (blanco)
          // asumía un Tab sobre fondo pintado de primary — en la práctica
          // TODAS las Tabs de la app viven sobre fondo blanco/claro, dejando
          // el tab seleccionado ilegible. Cada consumidor real (metrics,
          // AdminTabs, PostsTabs, roles) ya lo venía parchando local con
          // '!important' — se corrige acá de una vez para no seguir
          // duplicándolo; esos overrides locales quedan como no-ops inocuos.
          '&.Mui-selected': { color: theme.palette.primary.contrastTextMuted, fontWeight: 700 },
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
    // Stack direction="row" no hace wrap por defecto (CSS flexWrap: nowrap) —
    // se usa en ~150 lugares de las 6 apps para filas de botones/campos/chips
    // que, sin esto, se salen de la pantalla en mobile en vez de acomodarse
    // en más de una línea. Wrap es un default seguro: las filas que ya caben
    // en una línea no cambian en nada.
    MuiStack: {
      styleOverrides: {
        root: { flexWrap: 'wrap' },
      },
    },
    // Mismo criterio para los botones de acción de los diálogos (Aprobar/
    // Rechazar/Cancelar, etc.) — sin esto, 3+ botones se salen del diálogo
    // en mobile en vez de pasar a una segunda línea.
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '16px 24px', flexWrap: 'wrap', rowGap: 8 },
      },
    },
    // Mismo criterio: grupos de botones tipo "pill" (selector de rol, de
    // métrica a comparar, etc.) no envuelven por defecto.
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { flexWrap: 'wrap' },
      },
    },
  },
});
