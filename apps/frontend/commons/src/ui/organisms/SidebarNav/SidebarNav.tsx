'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

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
  // Igual que activeMatchPrefixes, pero para sub-rutas con un id dinámico en
  // medio (ej. /brands/:id/campaigns/*) — un prefijo literal no puede
  // expresar "cualquier id aquí". Mismo patrón de '*' por segmento que ya usa
  // topbar-titles.ts (getTopBarTitle), pero matcheando por PREFIJO de
  // segmentos (no longitud exacta): activa si los primeros N segmentos de la
  // ruta calzan con el patrón, sin importar cuántos más sigan después.
  activeMatchSegmentPrefixes?: string[][];
  // Excluye este ítem de su propio match por prefijo de href/activeMatch
  // cuando la ruta cae en uno de estos patrones — para sub-rutas que "viven"
  // bajo este href pero en realidad pertenecen a otro ítem (ej.
  // /brands/:id/campaigns/* no es "Marcas", es "Mis Campañas"/"Mi perfil").
  activeMatchExcludeSegmentPrefixes?: string[][];
}

function segmentsMatch(pathname: string, pattern: string[]): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < pattern.length) return false;
  return pattern.every((seg, i) => seg === '*' || seg === segments[i]);
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  header?: ReactNode;
  collapsedHeader?: ReactNode;
}

export function SidebarNav({ items, activeHref, onNavigate, header, collapsedHeader }: SidebarNavProps) {
  const theme = useTheme();
  // Se siguen usando para decidir QUÉ CONTENIDO renderizar (labels vs solo
  // íconos, botón de cerrar vs control de contraer, Tooltip) — eso sí
  // necesita JS. Lo que YA NO deciden es el ANCHO/VISIBILIDAD del panel (ver
  // widthByBreakpoint más abajo) — eso se volvió 100% CSS (@media, resuelto
  // por el navegador al pintar) porque useMediaQuery por sí solo no puede
  // saber el viewport real hasta después de hidratar: con SSR, el server
  // manda el default (desktop) y el cliente corrige un instante después, lo
  // que se veía como "el sidebar se abre ancho/en blanco y de golpe se
  // contrae" en cada navegación entre zonas (window.location.href, recarga
  // completa de página en Multi-Zones).
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletDown = useMediaQuery(theme.breakpoints.down('md'));

  // null = "sin preferencia manual todavía", sigue el breakpoint. Una vez que
  // el usuario alterna a mano, su elección manda hasta que cruce de nuevo el
  // breakpoint (mismo criterio que cualquier sidebar responsive estándar).
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const collapsed = manualCollapsed ?? isTabletDown;
  // En mobile el concepto "collapsed" (icon-only) no aplica — el drawer
  // siempre se ve completo cuando está abierto, solo cambia si existe o no.
  const effectiveCollapsed = isMobile ? false : collapsed;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(true);
  const labelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // manualCollapsed es estado JS puro (no depende del viewport) — es idéntico
  // en el server y en el primer render del cliente, así que esta expresión da
  // exactamente el mismo objeto de breakpoints en ambos lados (sin eso no hay
  // mismatch de hidratación posible). Los valores que SÍ dependen del
  // viewport real quedan como claves de breakpoint (xs/sm/md) que el
  // navegador resuelve solo, sin esperar a React.
  const widthByBreakpoint = manualCollapsed === null
    ? { sm: WIDTH_COLLAPSED, md: WIDTH_EXPANDED }
    : manualCollapsed
      ? { sm: WIDTH_COLLAPSED }
      : { sm: WIDTH_EXPANDED };

  useEffect(() => () => {
    if (labelTimeoutRef.current) clearTimeout(labelTimeoutRef.current);
  }, []);

  // Evita quedar con el drawer "atascado" abierto si el usuario redimensiona
  // la ventana o rota el dispositivo cruzando el breakpoint de mobile.
  useEffect(() => {
    setMobileOpen(false);
  }, [isMobile]);

  function toggleCollapsed() {
    setManualCollapsed((prevManual) => {
      const prevCollapsed = prevManual ?? isTabletDown;
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
  // cada ítem. No aplica en mobile: ahí el fondo no alterna nada, solo el
  // botón de cerrar / el backdrop.
  function handleBackgroundClick(event: MouseEvent<HTMLDivElement>) {
    if (isMobile) return;
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

  // En mobile, navegar cierra el drawer (patrón estándar) — en desktop/tablet
  // no hay drawer que cerrar, se comporta igual que antes.
  function handleNavigate(href: string) {
    if (isMobile) setMobileOpen(false);
    onNavigate(href);
  }

  return (
    <>
      {/* Botón hamburguesa: display por breakpoint CSS (no por el booleano
          isMobile) — visible solo <sm Y con el drawer cerrado. Siempre
          montado; el navegador decide si se ve, sin esperar a hidratar. */}
      <IconButton
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir navegación"
        sx={{
          display: { xs: mobileOpen ? 'none' : 'inline-flex', sm: 'none' },
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 1250,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Spacer en el flujo normal: reserva el ancho real del sidebar dentro
          del flex row del AppShell, para que el contenido principal nunca
          quede debajo del panel fijo de abajo. Ningún AppShell necesita saber
          del estado collapsed/mobile — vive encapsulado acá. width por
          breakpoint CSS: 0 en mobile (el sidebar es un overlay, no empuja
          contenido), resuelto por el navegador sin flash. */}
      <Box sx={{ width: { xs: 0, ...widthByBreakpoint }, flexShrink: 0, transition: 'width 0.2s ease' }} />

      {/* Backdrop: display por breakpoint CSS — solo <sm con el drawer abierto. */}
      <Box
        onClick={() => setMobileOpen(false)}
        sx={{
          display: { xs: mobileOpen ? 'block' : 'none', sm: 'none' },
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0,0,0,0.5)',
          zIndex: 1199,
        }}
      />

      {/* position: fixed (no sticky): sticky depende de que ningún ancestro
          tenga su propio overflow/stacking context, algo que no podemos
          garantizar en 6 apps distintas. fixed se ancla directo al viewport,
          sin importar el alto de la página ni el árbol de contenedores.
          Siempre montado (antes solo se montaba con isMobile/mobileOpen vía
          JS) — display por breakpoint CSS decide visibilidad sin esperar a
          hidratar, que es justo lo que evita el flash de "se abre ancho y
          luego se contrae" en cada navegación entre zonas. */}
      <Box
        onClick={handleBackgroundClick}
        sx={{
          display: { xs: mobileOpen ? 'flex' : 'none', sm: 'flex' },
          position: 'fixed',
          top: 0,
          left: 0,
          width: { xs: '85vw', ...widthByBreakpoint },
          maxWidth: { xs: 300, sm: 'none' },
          height: '100dvh',
          zIndex: 1200,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          flexDirection: 'column',
          py: 2,
          cursor: isMobile ? 'default' : 'pointer',
          transition: isMobile ? 'none' : 'width 0.2s ease',
        }}
      >
        {isMobile ? (
          <IconButton
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar navegación"
            sx={{ alignSelf: 'flex-end', mr: 1, mb: 1 }}
          >
            <CloseIcon />
          </IconButton>
        ) : (
          // Control accesible por teclado para alternar collapsed sin
          // reintroducir un botón visible: permanece invisible salvo cuando
          // recibe foco por teclado (patrón sr-only-focusable). No envuelve
          // los links de navegación, así que nunca es un botón inválido.
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
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            px: effectiveCollapsed ? 0 : 2,
            mb: 1,
            overflow: 'hidden',
          }}
        >
          {effectiveCollapsed ? collapsedHeader : header}
        </Box>

        <List sx={{ px: effectiveCollapsed ? 1 : 1.5, pt: 0, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {items.map((item) => {
            const matchHref = item.activeMatch ?? item.href;
            const excluded = (item.activeMatchExcludeSegmentPrefixes ?? []).some((p) => segmentsMatch(activeHref, p));
            const primaryActive =
              !excluded &&
              (item.exactMatch
                ? activeHref === matchHref
                : activeHref === matchHref || activeHref.startsWith(`${matchHref}/`));
            const prefixActive = (item.activeMatchPrefixes ?? []).some(
              (p) => activeHref === p || activeHref.startsWith(`${p}/`),
            );
            const segmentPrefixActive = (item.activeMatchSegmentPrefixes ?? []).some((p) => segmentsMatch(activeHref, p));
            const active = primaryActive || prefixActive || segmentPrefixActive;
            const button = (
              <ListItemButton
                key={item.key}
                selected={active}
                onClick={() => handleNavigate(item.href)}
                sx={{
                  borderRadius: 2,
                  mb: 0.75,
                  justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  minHeight: 45,
                  display: 'flex',
                  alignItems: 'center',
                  px: effectiveCollapsed ? 1 : 2,
                  overflow: 'hidden',
                  color: active ? 'primary.contrastText' : 'primary.dark',
                  bgcolor: active ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: active ? 'primary.main' : 'rgba(224, 168, 0, 0.12)' },
                  '&.Mui-selected': { bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.main' } },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: effectiveCollapsed ? 0 : 36, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {(isMobile || labelsVisible) && !effectiveCollapsed && (
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: 14, noWrap: true }} />
                )}
              </ListItemButton>
            );

            return effectiveCollapsed ? (
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
