'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';

const WIDTH_EXPANDED = 220;
const WIDTH_COLLAPSED = 76;
// Debe coincidir con la duración de `transition: 'width 0.2s ease'` del
// contenedor: el label de cada ítem solo aparece una vez que el ancho
// terminó de animar, para no montarse mientras el sidebar aún está angosto
// (eso provocaba texto/columna desbordando y "saltando" a su lugar).
const WIDTH_TRANSITION_MS = 200;

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
  const [labelsVisible, setLabelsVisible] = useState(true);
  const labelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  useEffect(() => () => {
    if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prevCollapsed) => {
      const next = !prevCollapsed;
      if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
      if (next) {
        // Al contraer, el label se oculta de inmediato (no hay nada que
        // desbordar: el ancho solo se reduce).
        setLabelsVisible(false);
      } else {
        // Al expandir, se espera a que termine la transición de ancho antes
        // de montar el label.
        labelTimeoutRef.current = setTimeout(() => setLabelsVisible(true), WIDTH_TRANSITION_MS);
      }
      return next;
    });
  }

  // Clic en cualquier zona libre del sidebar (fondo, padding, espacio debajo
  // de los ítems) alterna collapsed. Se ignora si el clic se originó en un
  // elemento interactivo (link, botón, tooltip, etc.) — closest() en vez de
  // una lista de clases CSS, para no depender de la estructura interna de
  // cada ítem.
  function handleBackgroundClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    toggleCollapsed();
  }

  function handleToggleControlKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleCollapsed();
    }
  }

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
        onClick={handleBackgroundClick}
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
          cursor: 'pointer',
          transition: 'width 0.2s ease',
        }}
      >
        {/* Control accesible por teclado para alternar collapsed sin
            reintroducir un botón visible: permanece invisible salvo cuando
            recibe foco por teclado (patrón sr-only-focusable). No envuelve
            los links de navegación, así que nunca es un botón inválido. */}
        <Box
          role="button"
          tabIndex={0}
          aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'}
          onClick={toggleCollapsed}
          onKeyDown={handleToggleControlKeyDown}
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            '&:focus-visible': {
              position: 'static',
              width: 'auto',
              height: 'auto',
              overflow: 'visible',
              clipPath: 'none',
              whiteSpace: 'normal',
              display: 'block',
              mx: collapsed ? 1 : 2,
              mb: 1,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'primary.main',
              color: 'primary.dark',
              fontSize: 12,
              fontWeight: 600,
              bgcolor: 'background.paper',
            },
          }}
        >
          {collapsed ? 'Expandir navegación' : 'Contraer navegación'}
        </Box>

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
                  overflow: 'hidden',
                  color: active ? 'primary.contrastText' : 'primary.dark',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: active ? 'primary.main' : 'rgba(224, 168, 0, 0.12)' },
                  '&.Mui-selected': { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.main' } },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {labelsVisible && !collapsed && (
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: 14, noWrap: true }} />
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
