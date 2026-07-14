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
import { SidebarNav, type SidebarNavItem, usePermissions } from '@repo/ui/ui';
import { selectUser } from '@repo/ui/state';
import { AppRole } from '@repo/ui/types';
import { useSelector } from 'react-redux';

const WEB_SHELL_URL = 'http://localhost:3000';
const POSTS_FRONT_URL = 'http://localhost:3014';
const BRANDS_FRONT_URL = 'http://localhost:3013';
const ADMIN_FRONT_URL = 'http://localhost:3010';

interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string }[];
}

const NAV_ITEMS_WITH_PERMISSION: NavItemWithPermission[] = [
  { key: 'dashboard', label: 'Dashboard', href: `${WEB_SHELL_URL}/dashboard`, icon: <DashboardIcon /> },
  { key: 'posts', label: 'Posts', href: `${POSTS_FRONT_URL}/posts`, icon: <ArticleIcon />, requirePermission: [{ module: 'post', action: 'create' }, { module: 'post', action: 'approve' }] },
  // LEGACY (dominio v3): lista de "Marcas" para Admin sobre /brands, la ruta de
  // browsing multi-perfil que se conserva por compatibilidad (ver
  // brands-front/src/app/brands). No quitar hasta que /brands se retire.
  { key: 'brands', label: 'Marcas', href: `${BRANDS_FRONT_URL}/brands`, icon: <StorefrontIcon />, requirePermission: [{ module: 'brands', action: 'manage' }] },
  { key: 'my-campaigns', label: 'Mis Campañas', href: `${BRANDS_FRONT_URL}/my-campaigns`, icon: <CampaignIcon />, requirePermission: [{ module: 'campaigns', action: 'view-own' }] },
  { key: 'my-brand', label: 'Mi perfil', href: `${BRANDS_FRONT_URL}/profile`, activeMatch: `${BRANDS_FRONT_URL}/profile`, exactMatch: true, icon: <StorefrontIcon />, requirePermission: [{ module: 'campaigns', action: 'create' }] },
  { key: 'calendar', label: 'Calendario', href: `${BRANDS_FRONT_URL}/profile/calendar`, icon: <CalendarMonthOutlinedIcon />, requirePermission: [{ module: 'campaigns', action: 'create' }, { module: 'campaigns', action: 'view-own' }] },
  { key: 'metrics', label: 'Métricas', href: '/metrics', icon: <BarChartIcon />, requirePermission: [{ module: 'metrics', action: 'view' }] },
  { key: 'team', label: 'Team', href: `${BRANDS_FRONT_URL}/team`, icon: <GroupIcon />, requirePermission: [{ module: 'campaigns', action: 'view-own' }] },
  { key: 'profile', label: 'Mi perfil', href: `${BRANDS_FRONT_URL}/profile`, exactMatch: true, icon: <AccountCircleOutlinedIcon />, requirePermission: [{ module: 'post', action: 'create' }, { module: 'campaigns', action: 'view-own' }] },
  { key: 'admin', label: 'Admin', href: `${ADMIN_FRONT_URL}/users`, icon: <AdminPanelSettingsIcon />, requirePermission: [{ module: 'users', action: 'manage' }] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  const user = useSelector(selectUser);
  const isAdmin = user?.role === AppRole.ADMINISTRADOR;

  const permissionVisible = NAV_ITEMS_WITH_PERMISSION.filter(
    (item) => !item.requirePermission || item.requirePermission.some((p) => can(p.module, p.action)),
  );
  // Ajuste de UX (no de permisos): Admin no debe operar como usuario de negocio
  // (Marcas/Posts/Métricas/Mis Campañas/Team/Mi perfil), solo Dashboard y Admin
  // (que ya contiene Usuarios/Roles/Catálogos/Auditoría vía AdminTabs).
  const visibleItems = isAdmin
    ? permissionVisible.filter((item) => item.key === 'dashboard' || item.key === 'admin')
    : permissionVisible;

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
