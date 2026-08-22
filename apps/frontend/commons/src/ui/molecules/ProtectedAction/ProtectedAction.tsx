'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';

interface ProtectedActionProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedAction({ module, action, children, fallback = null }: ProtectedActionProps) {
  const { can } = usePermissions();
  // Los permisos se cargan recién en useSessionBootstrap (tras montar, desde
  // la cookie). El servidor nunca los conoce, así que el primer render del
  // cliente debe verse igual que el del servidor (fallback) para no romper
  // la hidratación; recién después de montar se revela el contenido real.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{fallback}</>;
  return <>{can(module, action) ? children : fallback}</>;
}
