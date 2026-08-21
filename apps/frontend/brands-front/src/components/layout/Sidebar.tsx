'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CampaignIcon from '@mui/icons-material/Campaign';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MicOutlinedIcon from '@mui/icons-material/MicOutlined';
import { SidebarNav, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AppRole, AppModule, AppAction } from '@repo/ui/types';
import { useSelector } from 'react-redux';
import type { NavItemWithPermission } from '../../interfaces/interface';

// Hrefs RELATIVOS a propósito (nunca ZONE_URLS.X directo) — ver comentario
// en getPostAuthDestination.ts. Los que viven en OTRA zona (dashboard,
// posts, metrics, admin) dependen de CROSS_ZONE_HREFS más abajo para forzar
// navegación dura en vez de router.push().
const NAV_ITEMS_WITH_PERMISSION: NavItemWithPermission[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  // Mis Campañas / Mi perfil van primero (justo después de Dashboard): mismo
  // destino que "Mi perfil" de abajo NO existe más abajo — se quitó ese
  // duplicado (apuntaba al mismo /profile). "Mis Campañas" (campanas:ver) y
  // "Mi perfil" (marcas:crear/editar) son mutuamente excluyentes por diseño
  // (landings distintos) — la exclusividad se resuelve por el permiso real
  // de marcas más abajo (hasProfileAccess), no por nombre de rol.
  // activeMatchPrefixes: el detalle/equipo/publicaciones de una campaña vive
  // en /profile/campaigns/*, que no tiene su propio ítem de nav — sin esto,
  // ningún ítem quedaba activo al entrar al detalle de una campaña.
  // activeMatchSegmentPrefixes: el detalle/lista/equipo de una campaña vive
  // ahora en /brands/:id/campaigns/* (Fase M consolidó ahí también la vía
  // /profile/campaigns/[campaignId], que ya no existe) — activeMatchPrefixes
  // no alcanza porque no puede expresar el id dinámico de la marca en medio.
  // Solo "Mis Campañas" (CM/Diseñador) lo reclama — Cliente no ve este ítem,
  // así que en detalle de campaña le corresponde a "Marcas" (ver abajo).
  { key: 'my-campaigns', label: 'Mis Campañas', href: '/my-campaigns', activeMatchPrefixes: ['/profile/campaigns'], activeMatchSegmentPrefixes: [['brands', '*', 'campaigns']], icon: <CampaignIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  // Sin activeMatchSegmentPrefixes de campañas: quien ve "Mi perfil" con
  // hasProfileAccess también ve "Marcas", así que el detalle de campaña le
  // corresponde a ese ítem, no a este — ver el ajuste de
  // "brands".activeMatchExcludeSegmentPrefixes más abajo. Sin
  // requirePermission a propósito (antes: marcas:crear/editar, sacaba a
  // CM/Diseñador de este arreglo en la pasada de permissionVisible ANTES de
  // que roleAdjusted pudiera re-incluirlos — bug real, "Mi perfil" seguía
  // sin aparecer pese a que roleAdjusted ya decía `return true`) — la
  // visibilidad real la decide roleAdjusted más abajo, no este campo.
  { key: 'my-brand', label: 'Mi perfil', href: '/profile', activeMatch: '/profile', exactMatch: true, activeMatchPrefixes: ['/profile/campaigns'], icon: <AccountCircleOutlinedIcon /> },
  // Alexa Skill no tiene módulo propio en el catálogo de permisos (no
  // existe ningún `alexa:*` en el seed/enum real, confirmado) — el gate real
  // es de rol (Cliente/Diseñador), tanto aquí como en la propia página
  // /profile/alexa y en el backend (auth.service.ts.createLinkCode). Antes
  // solo se llegaba entrando primero a "Mi perfil" — inalcanzable para
  // Diseñador, que no ve ese ítem (ver roleAdjusted). Ítem propio para que
  // el permiso/rol que ya autoriza a Diseñador tenga un camino real.
  { key: 'alexa', label: 'Alexa Skill', href: '/profile/alexa', icon: <MicOutlinedIcon /> },
  // Antes sin AppAction.VIEW: un rol nuevo de solo lectura (solo
  // publicaciones:ver, sin crear/aprobar) nunca veía este ítem pese a poder
  // listar publicaciones de verdad — mismo hallazgo que el resto del punto 8
  // (auditoría final).
  { key: 'posts', label: 'Posts', href: '/posts', icon: <ArticleIcon />, requirePermission: [{ module: AppModule.POST, action: AppAction.CREATE }, { module: AppModule.POST, action: AppAction.APPROVE }, { module: AppModule.POST, action: AppAction.VIEW }] },
  // LEGACY (dominio v3): lista de "Marcas" para Admin sobre /brands, la ruta de
  // browsing multi-perfil que se conserva por compatibilidad (ver
  // brands-front/src/app/brands). No quitar hasta que /brands se retire.
  // activeMatchExcludeSegmentPrefixes: por defecto (CM/Diseñador) /brands/:id/
  // campaigns/* no es "Marcas" — es "Mis Campañas" (arriba), aunque URL-mente
  // viva anidado aquí. Para Cliente (que no ve "Mis Campañas") esta exclusión
  // se quita en el componente (ver roleAdjusted, más abajo) — ahí sí le
  // corresponde a "Marcas".
  { key: 'brands', label: 'Marcas', href: '/brands', activeMatchExcludeSegmentPrefixes: [['brands', '*', 'campaigns']], icon: <StorefrontIcon />, requirePermission: [{ module: AppModule.BRANDS, action: AppAction.VIEW }] },
  // Calendario (fase UX): mismo par de permisos ya usado por "Mi perfil"/"Team"
  // — Cliente (campanas:crear) o CM/Diseñador (campanas:ver). No es un
  // permiso nuevo. Admin queda excluido igual que el resto vía isAdmin, abajo.
  { key: 'calendar', label: 'Calendario', href: '/profile/calendar', icon: <CalendarMonthOutlinedIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.CREATE }, { module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  { key: 'metrics', label: 'Métricas', href: '/metrics', icon: <BarChartIcon />, requirePermission: [{ module: AppModule.METRICS, action: AppAction.VIEW }] },
  // Equipo GENERAL del CM (Fase J) — distinto de "Team" de arriba (esa es
  // de solo lectura, agregado de colaboradores en campañas activas, mock
  // todavía). campanas:asignar solo lo tiene community_manager en el seed,
  // así que este ítem ya queda oculto para Cliente/Diseñador sin necesitar
  // un ajuste de rol explícito como "my-campaigns"/"my-brand" abajo.
  { key: 'my-team', label: 'Diseñadores', href: '/my-team', icon: <GroupIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.ASSIGN }] },
  { key: 'admin', label: 'Admin', href: '/users', icon: <AdminPanelSettingsIcon />, requirePermission: [{ module: AppModule.USERS, action: AppAction.VIEW }] },
];

// Rutas que viven en OTRA zona (fuera de brands-front) — ver handleNavigate.
const CROSS_ZONE_HREFS = new Set(['/dashboard', '/posts', '/metrics', '/users']);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const isAdmin = user?.roles?.includes(AppRole.ADMINISTRADOR) ?? false;

  const permissionVisible = NAV_ITEMS_WITH_PERMISSION.filter(
    (item) => !item.requirePermission || item.requirePermission.some((p) => can(p.module, p.action)),
  );
  // "Mis Campañas" es la cola de trabajo de CM/Diseñador (campanas:ver) —
  // sigue exclusiva de quien no es dueño de marca. "Mi perfil" en cambio
  // dejó de ser exclusiva de Cliente/Admin (antes: solo hasProfileAccess) —
  // /profile ya renderiza contenido real para CM/Diseñador también
  // (StaffProfileSection: nombre/categorías/especialidades, necesario para
  // aparecer en "asignar diseñador a campaña"), así que ocultarles el ítem
  // los dejaba sin ningún camino de navegación para completarlo (hallazgo
  // real, reportado en vivo). hasProfileAccess se sigue usando para decidir
  // QUÉ ve /profile (ClientSection vs StaffProfileSection), no si el ítem
  // del Sidebar existe.
  const hasProfileAccess = can('marcas', 'crear') || can('marcas', 'editar');
  // Alexa Skill sigue siendo la única excepción documentada: no existe
  // ningún permiso real para Alexa en el catálogo (confirmado en auditoría),
  // y el propio backend (auth.service.ts.createLinkCode) también autoriza
  // por rol hardcodeado, no por permiso — generalizar solo aquí crearía un
  // desfase con el backend real. No se inventa un permiso `alexa:*` nuevo.
  const canUseAlexaSkill = (user?.roles ?? []).some((r) => r === AppRole.CLIENTE || r === AppRole.DISENADOR);
  const roleAdjusted = permissionVisible
    .filter((item) => {
      if (item.key === 'my-campaigns') return !hasProfileAccess;
      if (item.key === 'my-brand') return true;
      if (item.key === 'alexa') return canUseAlexaSkill;
      return true;
    })
    // "Marcas" solo cede el active de /brands/:id/campaigns/* a "Mis
    // Campañas" cuando ese ítem existe (filtrado arriba) — quien tiene "Mi
    // perfil" en su lugar (no reclama campañas ahí), así que "Marcas" debe
    // quedarse activo él mismo.
    .map((item) => (item.key === 'brands' && hasProfileAccess ? { ...item, activeMatchExcludeSegmentPrefixes: undefined } : item));
  // Ajuste de UX (no de permisos): Admin no debe operar como usuario de negocio
  // (Marcas/Posts/Métricas/Mis Campañas/Team/Mi perfil), solo Dashboard y Admin
  // (que ya contiene Usuarios/Roles/Catálogos/Auditoría vía AdminTabs).
  // Mientras la sesión no hidrata (!user), `can()` siempre da false y esta
  // lista quedaría casi vacía por un instante — se manda [] explícito en vez
  // de esa lista "casi vacía pero incorrecta", para no mostrar/ocultar ítems
  // equivocados ni un salto de layout cuando los reales aparecen.
  const visibleItems = !user
    ? []
    : isAdmin
      ? roleAdjusted.filter((item) => item.key === 'dashboard' || item.key === 'admin')
      : roleAdjusted.filter((item) => item.key !== 'dashboard');

  // Bug real encontrado en vivo: la condición vieja detectaba cross-zona por
  // si el href empezaba con "http" — al volverse todos relativos (ver
  // arriba) esa condición dejó de dispararse nunca, y router.push() intentó
  // una transición client-side hacia rutas de OTRAS zonas, que el bundle de
  // brands-front no conoce (patrón Multi-Zones: la navegación entre zonas
  // SIEMPRE debe ser dura, nunca router.push/<Link>). CROSS_ZONE_HREFS lista
  // explícita en vez de eso.
  function handleNavigate(href: string) {
    if (CROSS_ZONE_HREFS.has(href)) {
      window.location.href = href;
      return;
    }
    router.push(href);
  }

  return (
    <SidebarNav
      items={visibleItems}
      activeHref={pathname}
      onNavigate={handleNavigate}
      header={
        <Image src="/LogoNameMonkey.png" alt="Bananagram" width={1146} height={308} style={{ width: '100%', maxWidth: 150, height: 'auto' }} />
      }
      collapsedHeader={
        <Image src="/LogoMonkey.png" alt="Bananagram" width={308} height={308} style={{ width: '100%', maxWidth: 38, height: 'auto' }} />
      }
    />
  );
}
