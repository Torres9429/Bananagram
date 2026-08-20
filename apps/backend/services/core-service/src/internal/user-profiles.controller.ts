import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InternalAuthGuard } from '@repo/backend-commons';
import { prisma } from '../prisma/client';
import { UpsertUserProfileDto } from './dto/upsert-user-profile.dto';

// Tráfico servicio-a-servicio (auth-service → core-service tras un
// registro), no de un usuario final con Bearer token — por eso no lleva
// JwtAuthGuard, sino InternalAuthGuard (secreto compartido por header,
// X-Internal-Token). No se expone vía gateway (no hay regla /api/internal/*
// en su proxy), pero eso NO bastaba como protección real: el puerto de este
// servicio se publica al host, así que sin este guard era alcanzable sin
// ninguna autenticación desde fuera del contenedor.
@ApiTags('internal')
@UseGuards(InternalAuthGuard)
@Controller('internal/user-profiles')
export class UserProfilesController {
  // Usado por auth-service al canjear un LinkCode (Alexa Skill) para
  // devolver el nombre para mostrar junto a los tokens — ese dato solo vive
  // aquí (UserProfile.name), auth-service no lo tiene. null si el perfil
  // todavía no existe (best-effort del lado de quien llama).
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    return prisma.userProfile.findUnique({ where: { userId } });
  }

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
    const requiresProfileTaxonomies = dto.roleNames.some((roleName) => roleName !== 'cliente');
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
          roleNames: dto.roleNames,
        },
        create: {
          userId: dto.userId,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          roleNames: dto.roleNames,
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
