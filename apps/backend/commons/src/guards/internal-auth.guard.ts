import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Protege endpoints /internal/* (tráfico servicio-a-servicio, ej.
// auth-service<->core-service) — hoy esos endpoints no tienen ningún guard,
// y su comentario original asumía "solo alcanzable en la red interna de
// Docker", lo cual es falso: los puertos de los servicios se publican al
// host sin restricción. Falla cerrado: si el secreto no está configurado en
// este proceso, deniega todo en vez de dejar pasar.
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    if (!expected) {
      throw new UnauthorizedException('INTERNAL_SERVICE_SECRET no configurado en este servicio');
    }

    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-internal-token'];
    if (provided !== expected) {
      throw new UnauthorizedException('Token de servicio interno inválido');
    }

    return true;
  }
}
