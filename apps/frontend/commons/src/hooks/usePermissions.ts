'use client';
import { useSelector } from 'react-redux';
import { selectPermissions } from '../state/auth.slice';

export function usePermissions() {
  const permissions = useSelector(selectPermissions);

  const can = (module: string, action: string): boolean =>
    permissions?.[module]?.includes(action) ?? false;

  const canAny = (module: string, actions: string[]): boolean =>
    actions.some(a => can(module, a));

  return { can, canAny, permissions };
}
