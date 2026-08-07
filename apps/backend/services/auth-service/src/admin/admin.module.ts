import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRolesService } from './admin-roles.service';

@Module({
  imports: [PermissionsModule, AuthModule],
  controllers: [UsersController, RolesController],
  providers: [AdminUsersService, AdminRolesService],
})
export class AdminModule {}
