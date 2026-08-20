'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CampaignIcon from '@mui/icons-material/Campaign';
import BarChartIcon from '@mui/icons-material/BarChart';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MicOutlinedIcon from '@mui/icons-material/MicOutlined';
import { SidebarNav, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AppRole, AppModule, AppAction } from '@repo/ui/types';
import { ZONE_URLS } from '@repo/ui/config';
import { useSelector } from 'react-redux';
import type { NavItemWithPermission } from '../../interfaces/interface';

const { postsFront: POSTS_FRONT_URL, brandsFront: BRANDS_FRONT_URL, analyticsFront: ANALYTICS_FRONT_URL, adminFront: ADMIN_FRONT_URL } = ZONE_URLS;

const NAV_ITEMS_WITH_PERMISSION: NavItemWithPermission[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  // Mis Campañas / Mi perfil van primero (justo después de Dashboard): mismo
  // destino que "Mi perfil" de abajo NO existe más abajo — se quitó ese
  // duplicado (apuntaba al mismo /profile). "Mis Campañas" (campanas:ver) y
  // "Mi perfil" (marcas:crear/editar) son mutuamente excluyentes por diseño
  // (landings distintos) — la exclusividad se resuelve por el permiso real
  // de marcas más abajo (hasProfileAccess), no por nombre de rol.
  { key: 'my-campaigns', label: 'Mis Campañas', href: `${BRANDS_FRONT_URL}/my-campaigns`, icon: <CampaignIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  // Sin requirePermission a propósito (antes: marcas:crear/editar, sacaba a
  // CM/Diseñador de este arreglo en permissionVisible ANTES de que
  // roleAdjusted pudiera re-incluirlos — bug real, "Mi perfil" seguía sin
  // aparecer pese a que roleAdjusted ya decía `return true`) — la
  // visibilidad real la decide roleAdjusted más abajo, no este campo.
  { key: 'my-brand', label: 'Mi perfil', href: `${BRANDS_FRONT_URL}/profile`, activeMatch: `${BRANDS_FRONT_URL}/profile`, exactMatch: true, icon: <AccountCircleOutlinedIcon /> },
  // Alexa Skill no tiene módulo propio en el catálogo de permisos — el gate
  // real es de rol (Cliente/Diseñador), igual que en brands-front/Sidebar.tsx
  // y en /profile/alexa/page.tsx. No se inventa un permiso nuevo.
  { key: 'alexa', label: 'Alexa Skill', href: `${BRANDS_FRONT_URL}/profile/alexa`, icon: <MicOutlinedIcon /> },
  // Antes sin AppAction.VIEW: un rol nuevo de solo lectura (solo
  // publicaciones:ver, sin crear/aprobar) nunca veía este ítem pese a poder
  // listar publicaciones de verdad — mismo hallazgo que el resto del punto 8
  // (auditoría final).
  { key: 'posts', label: 'Posts', href: `${POSTS_FRONT_URL}/posts`, icon: <ArticleIcon />, requirePermission: [{ module: AppModule.POST, action: AppAction.CREATE }, { module: AppModule.POST, action: AppAction.APPROVE }, { module: AppModule.POST, action: AppAction.VIEW }] },
  // LEGACY (dominio v3): lista de "Marcas" para Admin sobre /brands, la ruta de
  // browsing multi-perfil que se conserva por compatibilidad (ver
  // brands-front/src/app/brands). No quitar hasta que /brands se retire.
  { key: 'brands', label: 'Marcas', href: `${BRANDS_FRONT_URL}/brands`, icon: <StorefrontIcon />, requirePermission: [{ module: AppModule.BRANDS, action: AppAction.VIEW }] },
  { key: 'calendar', label: 'Calendario', href: `${BRANDS_FRONT_URL}/profile/calendar`, icon: <CalendarMonthOutlinedIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.CREATE }, { module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  { key: 'metrics', label: 'Métricas', href: `${ANALYTICS_FRONT_URL}/metrics`, icon: <BarChartIcon />, requirePermission: [{ module: AppModule.METRICS, action: AppAction.VIEW }] },
  { key: 'admin', label: 'Admin', href: `${ADMIN_FRONT_URL}/users`, icon: <AdminPanelSettingsIcon />, requirePermission: [{ module: AppModule.USERS, action: AppAction.VIEW }] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const isAdmin = user?.roles?.includes(AppRole.ADMINISTRADOR) ?? false;

  const permissionVisible = NAV_ITEMS_WITH_PERMISSION.filter(
    (item) => !item.requirePermission || item.requirePermission.some((p) => can(p.module, p.action)),
  );
  // "Mis Campañas" y "Mi perfil" siguen siendo mutuamente excluyentes por
  // diseño (landings distintos), pero ya NO se decide por nombre de rol
  // (antes: isCliente) — se decide por el permiso real que separa ambas
  // identidades: quien puede crear/editar marcas "es dueño de marca", sin
  // importar su rol. Alexa sigue siendo la única excepción documentada: no
  // existe permiso real para Alexa en el catálogo (confirmado en auditoría),
  // y el backend real también autoriza por rol — no se inventa un permiso.
  const hasProfileAccess = can('marcas', 'crear') || can('marcas', 'editar');
  const canUseAlexaSkill = (user?.roles ?? []).some((r) => r === AppRole.CLIENTE || r === AppRole.DISENADOR);
  // "Mi perfil" ya no es exclusiva de hasProfileAccess (antes: solo
  // Cliente/Admin la veían) — /profile también renderiza contenido real
  // para CM/Diseñador (StaffProfileSection), y sin este ítem no tenían
  // ningún camino de navegación para completar su perfil (hallazgo real,
  // ver brands-front/Sidebar.tsx para el detalle completo).
  const roleAdjusted = permissionVisible.filter((item) => {
    if (item.key === 'my-campaigns') return !hasProfileAccess;
    if (item.key === 'my-brand') return true;
    if (item.key === 'alexa') return canUseAlexaSkill;
    return true;
  });
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

  function handleNavigate(href: string) {
    if (href.startsWith('http')) {
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
