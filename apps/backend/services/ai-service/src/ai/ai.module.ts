import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenRouterClient } from './openrouter.client';
import { CoreServiceClient } from './core-service.client';

@Module({
  controllers: [AiController],
  providers: [AiService, OpenRouterClient, CoreServiceClient],
})
export class AiModule {}
