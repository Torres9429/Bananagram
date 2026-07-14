'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@repo/ui/state';
import { AppRole } from '@repo/ui/types';
import { getPostAuthDestination } from '@repo/ui/utils';
import { DashboardAdmin } from '../../../components/dashboard/DashboardAdmin';

export default function DashboardPage() {
  const user = useSelector(selectUser);

  // Dashboard es exclusivo de Administrador. Mientras la sesión de Redux
  // aún no hidrata, `user` es undefined un instante — no se renderiza nada
  // (nunca un dashboard de negocio como fallback) hasta saber el rol real.
  useEffect(() => {
    if (user && user.role !== AppRole.ADMINISTRADOR) {
      window.location.href = getPostAuthDestination(user.role);
    }
  }, [user]);

  if (user?.role === AppRole.ADMINISTRADOR) {
    return <DashboardAdmin />;
  }

  return null;
}
