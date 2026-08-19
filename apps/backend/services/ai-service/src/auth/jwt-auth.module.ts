import { Global, Module } from '@nestjs/common';
import { TokenDenylistService } from '@repo/backend-commons';

// @Global(): mismo motivo que alexa-service/core-service — sin passport,
// TokenDenylistService debe estar disponible en todo módulo que use
// JwtAuthGuard vía @UseGuards, no solo en los que importen este módulo.
@Global()
@Module({
  providers: [TokenDenylistService],
  exports: [TokenDenylistService],
})
export class JwtAuthModule {}
