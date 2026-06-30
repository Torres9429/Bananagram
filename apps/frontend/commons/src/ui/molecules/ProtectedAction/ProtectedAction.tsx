'use client';
import type { ReactNode } from 'react';
import { usePermissions } from '../../../hooks/usePermissions';

interface ProtectedActionProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedAction({ module, action, children, fallback = null }: ProtectedActionProps) {
  const { can } = usePermissions();
  return <>{can(module, action) ? children : fallback}</>;
}
