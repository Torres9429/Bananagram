// Copia local deliberada (mismo criterio que JwtAuthGuard en este servicio):
// core-service no importa commons/ para poder desplegarse solo.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
