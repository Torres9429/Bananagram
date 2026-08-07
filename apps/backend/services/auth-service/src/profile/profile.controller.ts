import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

type Claims = { sub: string; roles: string[] };

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch('profile')
  completeProfile(@Body() dto: CompleteProfileDto, @CurrentUser() user: Claims) {
    return this.profile.completeProfile(user, dto);
  }
}
