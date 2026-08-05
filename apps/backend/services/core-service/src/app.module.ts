import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { InternalModule } from './internal/internal.module';
import { BrandsModule } from './brands/brands.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PostsModule } from './posts/posts.module';
import { ReportsModule } from './reports/reports.module';
import { IdeasModule } from './ideas/ideas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CatalogsModule,
    CloudinaryModule,
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
