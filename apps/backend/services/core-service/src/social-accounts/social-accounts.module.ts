import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
  // Exportado para que BrandsModule pueda ofrecer GET /brands/:id/metrics-history
  // (historial de seguidores) sin duplicar la query en otro service.
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}
