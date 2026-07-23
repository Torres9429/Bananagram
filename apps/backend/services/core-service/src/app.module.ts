import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';

@Module({ imports: [CatalogsModule] })
export class AppModule {}
