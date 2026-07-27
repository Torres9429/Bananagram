import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';
import { InternalModule } from './internal/internal.module';
import { BrandsModule } from './brands/brands.module';
import { CampaignsModule } from './campaigns/campaigns.module';

@Module({ imports: [CatalogsModule, InternalModule, BrandsModule, CampaignsModule] })
export class AppModule {}
