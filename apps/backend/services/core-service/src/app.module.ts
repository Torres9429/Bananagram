import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';
import { InternalModule } from './internal/internal.module';
import { BrandsModule } from './brands/brands.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PostsModule } from './posts/posts.module';
import { ReportsModule } from './reports/reports.module';
import { IdeasModule } from './ideas/ideas.module';

@Module({
  imports: [
    CatalogsModule,
    InternalModule,
    BrandsModule,
    SocialAccountsModule,
    CampaignsModule,
    PostsModule,
    ReportsModule,
    IdeasModule,
  ],
})
export class AppModule {}
