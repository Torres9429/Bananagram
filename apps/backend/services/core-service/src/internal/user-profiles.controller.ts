import { Body, Controller, Post } from '@nestjs/common';
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
  upsert(@Body() dto: UpsertUserProfileDto) {
    return prisma.userProfile.upsert({
      where: { userId: dto.userId },
      update: { name: dto.name },
      create: { userId: dto.userId, name: dto.name },
    });
  }
}
