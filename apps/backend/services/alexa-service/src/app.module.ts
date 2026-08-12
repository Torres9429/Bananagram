import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthModule } from './auth/jwt-auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { IdeasModule } from './ideas/ideas.module';

// ConfigModule nuevo en esta fase: hasta ahora alexa-service no tenía forma
// de cargar un .env local en runtime (solo confiaba en defaults inline tipo
// `process.env.X ?? 'localhost...'`) — DATABASE_URL_CORE no puede tener un
// default seguro hardcodeado, así que hace falta cargar el .env de verdad.
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), JwtAuthModule, CampaignsModule, IdeasModule] })
export class AppModule {}
