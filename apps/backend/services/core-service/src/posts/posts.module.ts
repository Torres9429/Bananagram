import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { JwtAuthModule } from '../auth/jwt-auth.module';
import { NotificationsClientModule } from '../notifications/notifications-client.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [JwtAuthModule, CloudinaryModule, NotificationsClientModule, SchedulerModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}