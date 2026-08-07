import { Module } from '@nestjs/common';
import { JwtAuthModule } from './auth/jwt-auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { IdeasModule } from './ideas/ideas.module';

@Module({ imports: [JwtAuthModule, CampaignsModule, IdeasModule] })
export class AppModule {}
