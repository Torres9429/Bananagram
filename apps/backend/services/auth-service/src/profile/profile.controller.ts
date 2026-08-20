import { Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '@repo/backend-commons';
import { ProfileService, type UploadableFile } from './profile.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

type Claims = { sub: string; roles: string[] };

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: Claims) {
    return this.profile.getProfile(user.sub);
  }

  @Patch('profile')
  completeProfile(@Body() dto: CompleteProfileDto, @CurrentUser() user: Claims) {
    return this.profile.completeProfile(user, dto);
  }

  // Proxy puro hacia core-service (que es quien tiene Cloudinary) — mismo
  // patrón que completeProfile/getProfile, pero reenviando un archivo en vez
  // de JSON. No persiste nada acá ni en core-service todavía; el frontend
  // guarda la URL devuelta y la incluye en el siguiente PATCH profile.
  @Post('profile/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5_000_000 } }))
  uploadAvatar(@UploadedFile() file: UploadableFile, @CurrentUser() user: Claims) {
    return this.profile.uploadAvatar(user.sub, file);
  }
}
