// Copia local deliberada (mismo criterio que JwtAuthGuard en este servicio):
// core-service no importa commons/ para poder desplegarse solo. Lee
// user.permissions[module] del JWT que auth-service ya emitió (nunca
// hardcodea permisos, ver CLAUDE.md).
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<[string, string]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const [module, action] = required;
    const { user } = context.switchToHttp().getRequest();
    const allowed = user?.permissions?.[module]?.includes(action);
    if (!allowed) throw new ForbiddenException(`Permiso requerido: ${module}:${action}`);
    return true;
  }
}
