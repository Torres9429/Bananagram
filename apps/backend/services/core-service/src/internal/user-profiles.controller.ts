import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { prisma } from '../prisma/client';
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto';

// Sin JwtAuthGuard a propósito: es tráfico servicio-a-servicio (auth-service
// → core-service tras un registro), no de un usuario final con Bearer token.
// No se expone vía gateway (no hay regla /api/internal/* en su proxy), solo
// alcanzable en la red interna donde corren los microservicios.
@ApiTags('internal')
@Controller('internal/user-profiles')
export class UserProfilesController {
  @Post()
  async upsert(@Body() dto: UpsertUserProfileDto) {
    const existing = await prisma.userProfile.findUnique({
      where: { userId: dto.userId },
      include: { categories: true, specialties: true },
    });

    // Solo se exige categoría/especialidad cuando el perfil quedaría sin
    // ninguna al terminar esta llamada — perfil nuevo, o el caller mandó
    // explícitamente un array vacío. Si el campo viene undefined en una
    // actualización, se conserva lo que ya había (no es obligatorio
    // reenviar todo el perfil solo para cambiar, por ejemplo, avatarUrl).
    const requiresProfileTaxonomies = dto.roleName !== 'cliente';
    if (requiresProfileTaxonomies) {
      const categoriesEmpty =
        dto.categoryIds !== undefined ? dto.categoryIds.length === 0 : !existing || existing.categories.length === 0;
      const specialtiesEmpty =
        dto.specialtyIds !== undefined
          ? dto.specialtyIds.length === 0
          : !existing || existing.specialties.length === 0;

      if (categoriesEmpty) {
        throw new BadRequestException('Las categorías son obligatorias para community manager y diseñador');
      }
      if (specialtiesEmpty) {
        throw new BadRequestException('Las especialidades son obligatorias para community manager y diseñador');
      }
    }

    return prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.upsert({
        where: { userId: dto.userId },
        update: {
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          roleName: dto.roleName,
        },
        create: {
          userId: dto.userId,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          roleName: dto.roleName,
        },
      });

      if (dto.categoryIds !== undefined) {
        await tx.userProfileCategory.deleteMany({ where: { userProfileId: profile.id } });
        if (dto.categoryIds.length) {
          await tx.userProfileCategory.createMany({
            data: dto.categoryIds.map((categoryId) => ({ userProfileId: profile.id, categoryId })),
          });
        }
      }

      if (dto.specialtyIds !== undefined) {
        await tx.userProfileSpecialty.deleteMany({ where: { userProfileId: profile.id } });
        if (dto.specialtyIds.length) {
          await tx.userProfileSpecialty.createMany({
            data: dto.specialtyIds.map((specialtyId) => ({ userProfileId: profile.id, specialtyId })),
          });
        }
      }

      return tx.userProfile.findUnique({
        where: { id: profile.id },
        include: { categories: true, specialties: true },
      });
    });
  }
}
