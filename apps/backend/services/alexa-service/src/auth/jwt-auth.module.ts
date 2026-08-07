import { Global, Module } from '@nestjs/common';
import { TokenDenylistService } from '../guards/token-denylist.service';

// @Global(): mismo motivo que core-service/src/auth/jwt-auth.module.ts —
// sin passport, TokenDenylistService debe estar disponible en todo módulo
// que use JwtAuthGuard vía @UseGuards, no solo en los que importen este
// módulo explícitamente.
@Global()
@Module({
  providers: [TokenDenylistService],
  exports: [TokenDenylistService],
})
export class JwtAuthModule {}
