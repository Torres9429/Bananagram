/**
 * @Global: JwtAuthGuard (src/guards/) necesita TokenSignerService y
 * TokenDenylistService por inyección, y ese guard se usa con @UseGuards en
 * controllers de varios módulos (auth, profile, admin) — marcarlo global
 * evita que cada uno tenga que importar este módulo por separado.
 */
import { Global, Module } from '@nestjs/common';
import { TokenSignerService } from './token-signer.service';
import { TokenDenylistService } from './token-denylist.service';

@Global()
@Module({
  providers: [TokenSignerService, TokenDenylistService],
  exports: [TokenSignerService, TokenDenylistService],
})
export class TokenModule {}
