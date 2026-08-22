import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { AuditLogController } from './audit-log.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminRolesService } from './admin-roles.service';
import { AdminAuditLogService } from './admin-audit-log.service';

@Module({
  imports: [PermissionsModule, AuthModule],
  controllers: [UsersController, RolesController, AuditLogController],
  providers: [AdminUsersService, AdminRolesService, AdminAuditLogService],
})
export class AdminModule {}
