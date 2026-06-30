'use client';
import { usePermissions } from '@repo/ui';

interface Props {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ module, action, children, fallback = null }: Props) {
  const { can } = usePermissions();
  return can(module, action) ? <>{children}</> : <>{fallback}</>;
}
