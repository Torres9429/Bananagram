import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { CategoriesController } from './categories.controller';
import { CatalogsService } from './catalogs.service';
import { SocialNetworksController } from './social-networks.controller';
import { SpecialtiesController } from './specialties.controller';

@Module({
  imports: [JwtAuthModule],
  controllers: [CategoriesController, SpecialtiesController, SocialNetworksController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}