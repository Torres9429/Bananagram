import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';

@Module({ imports: [AuthModule, PermissionsModule, AdminModule, ProfileModule] })
export class AppModule {}
