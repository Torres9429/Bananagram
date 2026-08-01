import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { CompleteProfileDto } from './dto/complete-profile.dto';

// Inverso de REGISTER_ROLE_MAP (auth.service.ts) — el JWT trae el nombre
// largo del rol (Role.name), pero POST /internal/user-profiles de
// core-service espera los mismos valores cortos que ya usa el registro
// ('cliente' | 'cm' | 'disenador').
const ROLE_NAME_TO_SHORT: Record<string, string> = {
  cliente: 'cliente',
  community_manager: 'cm',
  disenador: 'disenador',
};

type CurrentUser = { sub: string; role: string };

@Injectable()
export class ProfileService {
  // Regla de negocio: el CM/Diseñador dado de alta por el Admin (solo
  // email+password+rol, sin nombre) queda fuera de las campañas hasta que
  // completa su propio perfil aquí — este endpoint es lo que hace que
  // aparezca en GET /campaigns/eligible-community-managers|eligible-designers (core-service
  // filtra por UserProfile.roleName, que recién se guarda con esta llamada).
  async completeProfile(user: CurrentUser, dto: CompleteProfileDto) {
    const roleName = ROLE_NAME_TO_SHORT[user.role];
    if (!roleName) {
      throw new BadRequestException(`El rol '${user.role}' no tiene un perfil que completar`);
    }

    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.sub,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        roleName,
        categoryIds: dto.categoryIds,
        specialtyIds: dto.specialtyIds,
      }),
    }).catch(() => {
      throw new BadGatewayException('No se pudo completar el perfil: core-service no responde');
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new BadRequestException(payload?.message ?? 'No se pudo completar el perfil');
    }

    return payload;
  }
}
