import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({ imports: [AuthModule, PermissionsModule] })
export class AppModule {}
