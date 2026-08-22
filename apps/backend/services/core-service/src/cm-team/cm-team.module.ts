import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { CmTeamController } from './cm-team.controller';
import { CmTeamService } from './cm-team.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [CmTeamController],
  providers: [CmTeamService],
})
export class CmTeamModule {}
