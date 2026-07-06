'use client';

import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const WIDTH_EXPANDED = 220;
const WIDTH_COLLAPSED = 76;

export interface SidebarNavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  // Si el href navega a una ruta distinta de donde realmente "aterriza"
  // (ej. un redirect), usa este prefijo para decidir el estado activo.
  activeMatch?: string;
  // Si el href tiene sub-rutas propias que ya tienen su propio ítem de
  // navegación (ej. /profile vs /profile/calendar, /profile/campaigns/*),
  // exactMatch evita que ese ítem se marque activo por coincidencia de
  // prefijo — solo se activa en una coincidencia exacta de ruta.
  exactMatch?: boolean;
  // Prefijos adicionales que también activan este ítem, siempre por
  // coincidencia de prefijo (independiente de exactMatch) — para sub-rutas
  // que no tienen su propio ítem de navegación pero pertenecen a este (ej.
  // "Mis Campañas" también activo en /profile/campaigns/*, aunque su href
  // sea /my-campaigns).
  activeMatchPrefixes?: string[];
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  header?: ReactNode;
  collapsedHeader?: ReactNode;
}

export function SidebarNav({ items, activeHref, onNavigate, header, collapsedHeader }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  return (
    <>
      {/* Spacer en el flujo normal: reserva el ancho real del sidebar dentro
          del flex row del AppShell, para que el contenido principal nunca
          quede debajo del panel fijo de abajo. Ningún AppShell necesita saber
          del estado collapsed — vive encapsulado acá. */}
      <Box sx={{ width, flexShrink: 0, transition: 'width 0.2s ease' }} />

      {/* position: fixed (no sticky): sticky depende de que ningún ancestro
          tenga su propio overflow/stacking context, algo que no podemos
          garantizar en 5 apps distintas. fixed se ancla directo al viewport,
          sin importar el alto de la página ni el árbol de contenedores. */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width,
          height: '100dvh',
          zIndex: 1200,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          py: 2,
          transition: 'width 0.2s ease',
        }}
      >
        <IconButton
          size="small"
          onClick={() => setCollapsed((c) => !c)}
          sx={{
            position: 'absolute',
            top: 24,
            right: -14,
            // Alto y por encima del contenido: nunca debe quedar tapado por el
            // header/TopBar del área principal ni cortado por el propio sidebar.
            zIndex: 10,
            width: 28,
            height: 28,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            color: 'primary.dark',
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            px: collapsed ? 0 : 2,
            mb: 1,
            overflow: 'hidden',
          }}
        >
          {collapsed ? collapsedHeader : header}
        </Box>

        <List sx={{ px: collapsed ? 1 : 1.5, pt: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {items.map((item) => {
            const matchHref = item.activeMatch ?? item.href;
            const primaryActive = item.exactMatch
              ? activeHref === matchHref
              : activeHref === matchHref || activeHref.startsWith(`${matchHref}/`);
            const prefixActive = (item.activeMatchPrefixes ?? []).some(
              (p) => activeHref === p || activeHref.startsWith(`${p}/`),
            );
            const active = primaryActive || prefixActive;
            const button = (
              <ListItemButton
                key={item.key}
                selected={active}
                onClick={() => onNavigate(item.href)}
                sx={{
                  borderRadius: 2,
                  mb: 0.75,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  minHeight: 45,
                  display: 'flex',
                  alignItems: 'center',
                  px: collapsed ? 1 : 2,
                  color: active ? 'primary.contrastText' : 'primary.dark',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: active ? 'primary.main' : 'rgba(224, 168, 0, 0.12)' },
                  '&.Mui-selected': { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.main' } },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: 14 }} />
                )}
              </ListItemButton>
            );

            return collapsed ? (
              <Tooltip key={item.key} title={item.label} placement="right">
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </List>
      </Box>
    </>
  );
}
