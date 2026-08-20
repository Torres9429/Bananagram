import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';
import { CronModule } from '../cron/cron.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';

@Module({
  imports: [JwtAuthModule, SocialAccountsModule, CronModule, CloudinaryModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
