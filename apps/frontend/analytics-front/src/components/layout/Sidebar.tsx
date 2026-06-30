'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArticleIcon from '@mui/icons-material/Article';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CampaignIcon from '@mui/icons-material/Campaign';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { SidebarNav, type SidebarNavItem, usePermissions, selectUser, getMockSessionEmail } from '@repo/ui';

const WEB_SHELL_URL = 'http://localhost:3000';
const POSTS_FRONT_URL = 'http://localhost:3014';
const BRANDS_FRONT_URL = 'http://localhost:3013';
const ADMIN_FRONT_URL = 'http://localhost:3010';

interface NavItemWithPermission extends SidebarNavItem {
  requirePermission?: { module: string; action: string };
}

const NAV_ITEMS_WITH_PERMISSION: NavItemWithPermission[] = [
  { key: 'dashboard', label: 'Dashboard', href: `${WEB_SHELL_URL}/dashboard`, icon: <DashboardIcon /> },
  { key: 'posts', label: 'Posts', href: `${POSTS_FRONT_URL}/posts`, icon: <ArticleIcon />, requirePermission: { module: 'post', action: 'create' } },
  { key: 'brands', label: 'Marcas', href: `${BRANDS_FRONT_URL}/brands`, icon: <StorefrontIcon />, requirePermission: { module: 'brands', action: 'manage' } },
  { key: 'my-campaigns', label: 'Mis Campañas', href: `${BRANDS_FRONT_URL}/my-campaigns`, icon: <CampaignIcon />, requirePermission: { module: 'campaigns', action: 'view-own' } },
  { key: 'metrics', label: 'Métricas', href: '/metrics', icon: <BarChartIcon />, requirePermission: { module: 'metrics', action: 'view' } },
  { key: 'team', label: 'Team', href: `${BRANDS_FRONT_URL}/team`, icon: <GroupIcon />, requirePermission: { module: 'campaigns', action: 'view-own' } },
  { key: 'admin', label: 'Admin', href: `${ADMIN_FRONT_URL}/users`, icon: <AdminPanelSettingsIcon />, requirePermission: { module: 'users', action: 'manage' } },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermissions();
  const user = useSelector(selectUser);

  const visibleItems = NAV_ITEMS_WITH_PERMISSION.filter(
    (item) => !item.requirePermission || can(item.requirePermission.module, item.requirePermission.action),
  );

  function handleNavigate(href: string) {
    // Métricas vive en analytics-front; el resto son otros microfronts
    // (sin Multi-Zones real todavía), así que cruzamos con navegación absoluta.
    if (href.startsWith('http')) {
      const url = new URL(href);
      const sessionEmail = user?.email ?? getMockSessionEmail();
      if (sessionEmail) {
        url.searchParams.set('mock_user', sessionEmail);
      }
      window.location.href = url.toString();
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
        <Image
          src="/LogoName.png"
          alt="Bananagram"
          width={1146}
          height={308}
          style={{ width: '100%', maxWidth: 150, height: 'auto' }}
        />
      }
      collapsedHeader={
        <Image src="/Logo.png" alt="Bananagram" width={308} height={308} style={{ width: '100%', maxWidth: 38, height: 'auto' }} />
      }
    />
  );
}
