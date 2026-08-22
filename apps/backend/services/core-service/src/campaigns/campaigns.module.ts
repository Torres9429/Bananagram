import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { CronModule } from '../cron/cron.module';
import { NotificationsClientModule } from '../notifications/notifications-client.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignMetricsService } from './campaign-metrics.service';

@Module({
  imports: [JwtAuthModule, CronModule, NotificationsClientModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignMetricsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
