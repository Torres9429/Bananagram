import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MetaController } from './meta.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { TokenModule } from './token.module';

@Module({
  imports: [TokenModule],
  controllers: [AuthController, MetaController],
  providers: [AuthService, AuthRepository],
  exports: [AuthService, AuthRepository],
})
export class AuthModule {}
