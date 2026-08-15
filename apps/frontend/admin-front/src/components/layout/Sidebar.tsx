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
import { SidebarNav, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AppRole, AppModule, AppAction } from '@repo/ui/types';
import { ZONE_URLS } from '@repo/ui/config';
import { useSelector } from 'react-redux';
import type { NavItemWithPermission } from '../../interfaces/interface';

const { webShell: WEB_SHELL_URL, postsFront: POSTS_FRONT_URL, brandsFront: BRANDS_FRONT_URL, analyticsFront: ANALYTICS_FRONT_URL } = ZONE_URLS;

const NAV_ITEMS_WITH_PERMISSION: NavItemWithPermission[] = [
  { key: 'dashboard', label: 'Dashboard', href: `${WEB_SHELL_URL}/dashboard`, icon: <DashboardIcon /> },
  // Mis Campañas / Mi perfil van primero (justo después de Dashboard): mismo
  // destino que "Mi perfil" de abajo NO existe más abajo — se quitó ese
  // duplicado (apuntaba al mismo /profile). El backend real da campanas:ver
  // a los 3 roles no-admin (cliente/CM/diseñador) por igual, así que ya no
  // hay un permiso que separe "Cliente" de "CM/Diseñador" aquí — la
  // exclusividad (Cliente ve Mi perfil, CM/Diseñador ve Mis Campañas) se
  // resuelve por rol explícito más abajo (isCliente), no por permiso.
  { key: 'my-campaigns', label: 'Mis Campañas', href: `${BRANDS_FRONT_URL}/my-campaigns`, icon: <CampaignIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  { key: 'my-brand', label: 'Mi perfil', href: `${BRANDS_FRONT_URL}/profile`, activeMatch: `${BRANDS_FRONT_URL}/profile`, exactMatch: true, icon: <AccountCircleOutlinedIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.CREATE }] },
  { key: 'posts', label: 'Posts', href: `${POSTS_FRONT_URL}/posts`, icon: <ArticleIcon />, requirePermission: [{ module: AppModule.POST, action: AppAction.CREATE }, { module: AppModule.POST, action: AppAction.APPROVE }] },
  // LEGACY (dominio v3): lista de "Marcas" para Admin sobre /brands, la ruta de
  // browsing multi-perfil que se conserva por compatibilidad (ver
  // brands-front/src/app/brands). No quitar hasta que /brands se retire.
  { key: 'brands', label: 'Marcas', href: `${BRANDS_FRONT_URL}/brands`, icon: <StorefrontIcon />, requirePermission: [{ module: AppModule.BRANDS, action: AppAction.VIEW }] },
  { key: 'calendar', label: 'Calendario', href: `${BRANDS_FRONT_URL}/profile/calendar`, icon: <CalendarMonthOutlinedIcon />, requirePermission: [{ module: AppModule.CAMPAIGNS, action: AppAction.CREATE }, { module: AppModule.CAMPAIGNS, action: AppAction.VIEW }] },
  { key: 'metrics', label: 'Métricas', href: `${ANALYTICS_FRONT_URL}/metrics`, icon: <BarChartIcon />, requirePermission: [{ module: AppModule.METRICS, action: AppAction.VIEW }] },
  { key: 'admin', label: 'Admin', href: '/users', icon: <AdminPanelSettingsIcon />, requirePermission: [{ module: AppModule.USERS, action: AppAction.VIEW }] },
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
  // Ajuste de UX (no de permisos): igual que isAdmin abajo. "Mis Campañas" y
  // "Mi perfil" comparten permiso real (campanas:ver lo tienen los 3 roles
  // no-admin) así que ya no se pueden separar por permiso — se decide por
  // rol explícito cuál de los dos ve cada quien (eran, y siguen siendo,
  // mutuamente excluyentes por diseño: apuntan a landings distintos).
  const isCliente = user?.roles?.includes(AppRole.CLIENTE) ?? false;
  const roleAdjusted = permissionVisible.filter((item) => {
    if (item.key === 'my-campaigns') return !isCliente;
    if (item.key === 'my-brand') return isCliente;
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

  const activeHref = ['/roles', '/audit-log', '/catalogs'].some((p) => pathname.startsWith(p))
    ? '/users'
    : pathname;

  return (
    <SidebarNav
      items={visibleItems}
      activeHref={activeHref}
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
