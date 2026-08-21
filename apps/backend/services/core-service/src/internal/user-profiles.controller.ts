import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InternalAuthGuard } from '@repo/backend-commons';
import { prisma } from '../prisma/client';
import { S3Service, type UploadableFile } from '../storage/s3.service';
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
  constructor(private readonly storage: S3Service) {}

  // Usado por auth-service al canjear un LinkCode (Alexa Skill, solo lee
  // .name) y por ProfileController's GET me/profile (StaffProfileSection,
  // necesita categories/specialties para precargar el formulario — de ahí
  // el include, antes ausente aquí aunque el upsert de abajo sí lo
  // devolvía). null si el perfil todavía no existe (best-effort del lado de
  // quien llama).
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    return prisma.userProfile.findUnique({
      where: { userId },
      include: { categories: true, specialties: true },
    });
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

  // Sube la imagen a S3 y devuelve la URL — a propósito NO toca
  // UserProfile.avatarUrl acá (no exige que el perfil ya exista, evita el
  // caso raro de "subiste una foto pero el perfil todavía no tiene nombre/
  // categorías"). El caller (ProfileController.uploadAvatar) le pasa esa URL
  // de vuelta al frontend, que la incluye en el siguiente PATCH me/profile
  // (mismo POST /internal/user-profiles de arriba) junto con el resto del
  // formulario — una sola operación de guardado, no dos fuentes de verdad.
  @Post(':userId/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5_000_000 } }))
  async uploadAvatar(@UploadedFile() file: UploadableFile) {
    if (!file) throw new BadRequestException('Falta el archivo de imagen');
    const result = await this.storage.uploadFile(file, 'bananagram/avatars');
    return { avatarUrl: result.secure_url };
  }
}
