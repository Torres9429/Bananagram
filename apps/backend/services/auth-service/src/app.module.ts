import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health/health.controller';

// ConfigModule.forRoot() carga .env desde el cwd del proceso (la propia
// carpeta de auth-service) — antes este servicio no cargaba env por su
// cuenta, dependía de que Turborepo lo inyectara implícito al correr `pnpm
// dev`, algo que no aplica si se arranca de otra forma (node dist/main en
// producción, o directo sin turbo) — mismo criterio que core/alexa-service.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, PermissionsModule, AdminModule, ProfileModule, NotificationsModule],
  controllers: [HealthController],
})
export class AppModule {}
