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

type CurrentUser = { sub: string; roles: string[] };

export type UploadableFile = { buffer: Buffer; originalname: string; mimetype: string; size: number };

@Injectable()
export class ProfileService {
  // GET real para StaffProfileSection (brands-front) — antes ese formulario
  // era 100% mock (nunca leía ni escribía nada). Sin esto, cada "Guardar"
  // mandaría categoryIds/specialtyIds en blanco y el upsert de core-service
  // los interpretaría como "vaciar" (o rechazaría con 400 si el rol exige
  // categorías/especialidades) en vez de preservar lo que ya había.
  // null si el perfil todavía no existe (usuario dado de alta por el Admin,
  // nunca completó nada) — el frontend debe iniciar el formulario en blanco.
  async getProfile(userId: string) {
    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles/${userId}`, {
      headers: { 'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET ?? '' },
    }).catch(() => null);
    if (!response || !response.ok) return null;
    return response.json();
  }

  // Regla de negocio: el CM/Diseñador dado de alta por el Admin (solo
  // email+password+rol, sin nombre) queda fuera de las campañas hasta que
  // completa su propio perfil aquí — este endpoint es lo que hace que
  // aparezca en GET /campaigns/eligible-community-managers|eligible-designers (core-service
  // filtra por UserProfile.roleNames, que recién se guarda con esta llamada).
  async completeProfile(user: CurrentUser, dto: CompleteProfileDto) {
    const roleNames = user.roles.map((r) => ROLE_NAME_TO_SHORT[r]).filter(Boolean);
    if (roleNames.length === 0) {
      throw new BadRequestException(`Ninguno de tus roles tiene un perfil que completar`);
    }

    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET ?? '' },
      body: JSON.stringify({
        userId: user.sub,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        roleNames,
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

  // Proxy puro: reenvía el archivo recibido (multer/memoryStorage, ya en
  // memoria) como multipart hacia core-service, que es quien tiene
  // Cloudinary configurado. No usar 'Content-Type' manual con FormData —
  // fetch arma el boundary correcto solo; forzarlo rompe el parseo del lado
  // de core-service.
  async uploadAvatar(userId: string, file: UploadableFile) {
    if (!file) throw new BadRequestException('Falta el archivo de imagen');

    const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);

    const response = await fetch(`${coreServiceUrl}/api/internal/user-profiles/${userId}/avatar`, {
      method: 'POST',
      headers: { 'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET ?? '' },
      body: form,
    }).catch(() => {
      throw new BadGatewayException('No se pudo subir la imagen: core-service no responde');
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new BadRequestException(payload?.message ?? 'No se pudo subir la imagen');
    }

    return payload;
  }
}
