import { Module } from '@nestjs/common';
import { CatalogsModule } from './catalogs/catalogs.module';
import { InternalModule } from './internal/internal.module';

@Module({ imports: [CatalogsModule, InternalModule] })
export class AppModule {}
