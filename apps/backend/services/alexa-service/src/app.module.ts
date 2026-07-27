import { Module } from '@nestjs/common';
import { CampaignsModule } from './campaigns/campaigns.module';
import { IdeasModule } from './ideas/ideas.module';

@Module({ imports: [CampaignsModule, IdeasModule] })
export class AppModule {}
