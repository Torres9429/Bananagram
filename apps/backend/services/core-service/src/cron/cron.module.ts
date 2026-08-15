import { Module } from '@nestjs/common';
import { AyrshareModule } from '../integrations/ayrshare/ayrshare.module';
import { ScoreModule } from '../score/score.module';
import { MetricsCronService } from './metrics-cron.service';
import { AccountMetricsCronService } from './account-metrics-cron.service';

@Module({
  imports: [AyrshareModule, ScoreModule],
  providers: [MetricsCronService, AccountMetricsCronService],
  // Exportado para que CampaignsModule pueda ofrecer un refresh manual
  // (POST /campaigns/:id/metrics/refresh) sin esperar el cron de cada 6h.
  // AccountMetricsCronService también se exporta por el mismo motivo, para
  // BrandsModule (refresh manual de crecimiento de cuenta).
  exports: [MetricsCronService, AccountMetricsCronService],
})
export class CronModule {}
