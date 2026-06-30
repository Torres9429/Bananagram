import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../commons/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../commons/decorators/current-user.decorator';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class PermissionsController {
  @Get('permissions')
  getPermissions(@CurrentUser() user: any) {
    // Devuelve permissions del JWT — fuente de verdad del menú frontend
    return { permissions: user.permissions, brandIds: user.brandIds };
  }
}
