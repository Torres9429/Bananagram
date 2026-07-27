import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';

@Module({ imports: [AuthModule, PermissionsModule, AdminModule] })
export class AppModule {}
