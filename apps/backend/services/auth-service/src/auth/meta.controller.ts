// Endpoint público (sin @UseGuards, mismo criterio que login/register) para
// publicar el JWKS — core-service, alexa-service y el gateway lo consultan
// directo por HTTP (nunca a través del proxy) para verificar la firma RS256.
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { TokenSignerService } from './token-signer.service';

@ApiExcludeController()
@Controller()
export class MetaController {
  constructor(private readonly tokens: TokenSignerService) {}

  @Get('.well-known/jwks.json')
  jwks() {
    return this.tokens.getJwks();
  }
}
