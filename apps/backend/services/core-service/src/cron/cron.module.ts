import { Module } from '@nestjs/common';
import { AyrshareModule } from '../integrations/ayrshare/ayrshare.module';
import { MetricsCronService } from './metrics-cron.service';

@Module({
  imports: [AyrshareModule],
  providers: [MetricsCronService],
  // Exportado para que CampaignsModule pueda ofrecer un refresh manual
  // (POST /campaigns/:id/metrics/refresh) sin esperar el cron de cada 6h.
  exports: [MetricsCronService],
})
export class CronModule {}
