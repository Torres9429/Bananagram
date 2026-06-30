'use client';

import { useSelector } from 'react-redux';
import { selectUser } from '@repo/ui';
import { AppRole } from '@repo/ui';
import { DashboardAdmin } from '../../../components/dashboard/DashboardAdmin';
import { DashboardCM } from '../../../components/dashboard/DashboardCM';
import { DashboardCliente } from '../../../components/dashboard/DashboardCliente';
import { DashboardDisenador } from '../../../components/dashboard/DashboardDisenador';

export default function DashboardPage() {
  const user = useSelector(selectUser);

  switch (user?.role) {
    case AppRole.ADMINISTRADOR:
      return <DashboardAdmin />;
    case AppRole.CLIENTE:
      return <DashboardCliente />;
    case AppRole.DISENADOR:
      return <DashboardDisenador />;
    case AppRole.COMMUNITY_MANAGER:
    default:
      // Fallback a CM también para cuando la sesión está cargando.
      return <DashboardCM />;
  }
}
