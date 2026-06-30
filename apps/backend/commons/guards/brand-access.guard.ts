import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class BrandAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const brandId = request.params.brandId || request.params.id;
    if (brandId && !user.brandIds.includes(brandId)) {
      throw new ForbiddenException('No tienes acceso a esta marca');
    }
    return true;
  }
}
