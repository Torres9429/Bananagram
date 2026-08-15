import { Module } from '@nestjs/common';
import { AyrshareService } from './ayrshare.service';
import { MockSocialProvider } from './mock-social-provider';
import { SOCIAL_PROVIDER } from './social-provider.interface';

// SOCIAL_PROVIDER=mock|ayrshare (default mock) decide qué implementación se
// inyecta bajo el token SOCIAL_PROVIDER — el resto del sistema (scheduler,
// cron de métricas) solo conoce la interfaz, nunca la clase concreta.
@Module({
  providers: [
    MockSocialProvider,
    AyrshareService,
    {
      provide: SOCIAL_PROVIDER,
      useFactory: (mock: MockSocialProvider, real: AyrshareService) =>
        process.env.SOCIAL_PROVIDER === 'ayrshare' ? real : mock,
      inject: [MockSocialProvider, AyrshareService],
    },
  ],
  exports: [SOCIAL_PROVIDER],
})
export class AyrshareModule {}
