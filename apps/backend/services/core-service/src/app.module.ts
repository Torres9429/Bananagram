import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthModule } from './auth/jwt-auth.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { InternalModule } from './internal/internal.module';
import { BrandsModule } from './brands/brands.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CmTeamModule } from './cm-team/cm-team.module';
import { PostsModule } from './posts/posts.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CronModule } from './cron/cron.module';
import { ScoreModule } from './score/score.module';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Necesario para MetricsCronService/AccountMetricsCronService (@Cron) y
    // para SchedulerRegistry (PostSchedulerService ya no usa @Cron — arma
    // timers por evento, pero SchedulerRegistry también lo provee este módulo).
    ScheduleModule.forRoot(),
    JwtAuthModule,
    CatalogsModule,
    CloudinaryModule,
    InternalModule,
    BrandsModule,
    SocialAccountsModule,
    CampaignsModule,
    CmTeamModule,
    PostsModule,
    ReportsModule,
    SchedulerModule,
    CronModule,
    ScoreModule,
  ],
})
export class AppModule {}
