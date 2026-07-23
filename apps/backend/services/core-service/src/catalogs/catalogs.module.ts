import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CatalogsService } from './catalogs.service';
import { SocialNetworksController } from './social-networks.controller';
import { SpecialtiesController } from './specialties.controller';

@Module({
  controllers: [CategoriesController, SpecialtiesController, SocialNetworksController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}