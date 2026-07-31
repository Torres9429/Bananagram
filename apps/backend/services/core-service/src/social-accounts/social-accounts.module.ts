import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
})
export class SocialAccountsModule {}
