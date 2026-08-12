// Copia local deliberada (mismo criterio que JwtAuthGuard en este servicio):
// alexa-service no importa commons/ para poder desplegarse solo.
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(PERMISSION_KEY, [module, action]);
