import { Module } from '@nestjs/common';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [JwtAuthModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}